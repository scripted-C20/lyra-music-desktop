import { getDownloadFilePath } from '@renderer/utils/music'
import { requestMsg } from '@renderer/utils/message'

import {
  createGetMusicUrlTask as createOnlineGetMusicUrlTask,
  getPicUrl as getOnlinePicUrl,
  getLyricInfo as getOnlineLyricInfo,
} from './online'
import { buildLyricInfo, getCachedLyricInfo, type CancelableTask, type MusicUrlTaskOptions } from './utils'
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

export const createGetMusicUrlTask = ({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {}, taskOptions }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
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
        if (path) return path
      }

      const task = createOnlineGetMusicUrlTask({ musicInfo: musicInfo.metadata.musicInfo, isRefresh, onToggleSource, allowToggleSource, taskOptions })
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
  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo.metadata.musicInfo)
    if (lyricInfo) return buildLyricInfo(lyricInfo)
  }

  return getOnlineLyricInfo({
    musicInfo: musicInfo.metadata.musicInfo,
    isRefresh,
    onToggleSource,
  }).catch(async() => {
    // 尝试读取文件内歌词
    const path = await getDownloadFilePath(musicInfo, buildSavePath(musicInfo))
    if (path) {
      const rawlrcInfo = await window.lx.worker.main.getMusicFileLyric(path)
      if (rawlrcInfo) return buildLyricInfo(rawlrcInfo)
    }

    throw new Error('failed')
  })
}
