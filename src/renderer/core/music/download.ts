import { getDownloadFilePath } from '@renderer/utils/music'
import { requestMsg } from '@renderer/utils/message'
import { saveLyric } from '@renderer/utils/ipc'

import {
  createGetMusicUrlTask as createOnlineGetMusicUrlTask,
  getPicUrl as getOnlinePicUrl,
  getLyricInfo as getOnlineLyricInfo,
} from './online'
import { buildLyricInfo, getCachedLyricInfo, getCurrentResolvedSourceMusicInfo, type CancelableTask, type MusicUrlTaskOptions } from './utils'
import { buildSavePath } from '@renderer/store/download/utils'

export const getMusicUrl = async({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {}, taskOptions }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
  taskOptions?: MusicUrlTaskOptions
}): Promise<string> => {
  return createGetMusicUrlTask({ musicInfo, isRefresh, allowToggleSource, onToggleSource, taskOptions }).promise
}

export const createGetMusicUrlTask = ({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {}, onResolvedMusicInfo, taskOptions }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  onResolvedMusicInfo?: (musicInfo: LX.Download.ListItem | LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
  taskOptions?: MusicUrlTaskOptions
}): CancelableTask<string> => {
  let cancelTask = () => {}
  let isCancelled = false
  return {
    cancel() {
      isCancelled = true
      cancelTask()
    },
    promise: (async() => {
      if (!isRefresh) {
        const path = await getDownloadFilePath(musicInfo, buildSavePath(musicInfo))
        if (path) {
          onResolvedMusicInfo?.(musicInfo)
          return path
        }
      }

      const task = createOnlineGetMusicUrlTask({ musicInfo: musicInfo.metadata.musicInfo, isRefresh, onToggleSource, onResolvedMusicInfo, allowToggleSource, taskOptions })
      cancelTask = task.cancel
      const url = await task.promise
      if (isCancelled) throw new Error(requestMsg.cancelRequest)
      return url
    })(),
  }
}

export const getPicUrl = async({ musicInfo, isRefresh, listId, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  listId?: string | null
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (!isRefresh) {
    const path = await getDownloadFilePath(musicInfo, buildSavePath(musicInfo))
    if (path) {
      const pic = await window.lx.worker.main.getMusicFilePic(path)
      if (pic) return pic
    }

    const onlineMusicInfo = musicInfo.metadata.musicInfo
    if (onlineMusicInfo.meta.picUrl) return onlineMusicInfo.meta.picUrl
  }

  return getOnlinePicUrl({ musicInfo: musicInfo.metadata.musicInfo, isRefresh, onToggleSource }).then((url) => {
    // TODO: when listId required save url (update downloadInfo)

    return url
  })
}

export const getLyricInfo = async({ musicInfo, isRefresh, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  const targetMusicInfo = musicInfo.metadata.musicInfo
  let fileLyricInfoTask: Promise<LX.Music.LyricInfo | null> | null = null
  const getFileLyricInfo = async() => {
    fileLyricInfoTask ??= (async() => {
      const path = await getDownloadFilePath(musicInfo, buildSavePath(musicInfo))
      if (!path) return null
      return window.lx.worker.main.getMusicFileLyric(path)
    })()
    return fileLyricInfoTask
  }
  const getResolvedSourceLyricInfo = async() => {
    const resolvedMusicInfo = getCurrentResolvedSourceMusicInfo(musicInfo)
    if (!resolvedMusicInfo) return null
    try {
      const lyricInfo = await getOnlineLyricInfo({
        musicInfo: resolvedMusicInfo,
        isRefresh,
        onToggleSource,
        allowToggleSource: false,
      })
      void saveLyric(targetMusicInfo, lyricInfo)
      return lyricInfo
    } catch (err: any) {
      if (err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
    }
    return null
  }

  if (!isRefresh) {
    const [lyricInfo, fileLyricInfo] = await Promise.all([getCachedLyricInfo(targetMusicInfo), getFileLyricInfo()])
    if (lyricInfo?.lyric && lyricInfo.lyric != fileLyricInfo?.lyric) {
      return buildLyricInfo({ ...lyricInfo, rawlrcInfo: fileLyricInfo ?? lyricInfo.rawlrcInfo })
    }
    if (fileLyricInfo) return buildLyricInfo(fileLyricInfo)

    const resolvedLyricInfo = await getResolvedSourceLyricInfo()
    if (resolvedLyricInfo) return resolvedLyricInfo

    if (lyricInfo) return buildLyricInfo(lyricInfo)
  } else {
    const fileLyricInfo = await getFileLyricInfo()
    if (fileLyricInfo) return buildLyricInfo(fileLyricInfo)

    const resolvedLyricInfo = await getResolvedSourceLyricInfo()
    if (resolvedLyricInfo) return resolvedLyricInfo
  }

  return getOnlineLyricInfo({
    musicInfo: targetMusicInfo,
    isRefresh,
    onToggleSource,
  }).catch(async() => {
    const fileLyricInfo = await getFileLyricInfo()
    if (fileLyricInfo) return buildLyricInfo(fileLyricInfo)

    throw new Error('failed')
  })
}
