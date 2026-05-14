import { getSourceSearchTimeoutMs, getSourceSearchTimeoutWithBufferMs } from '@common/constants'
import { encodePath } from '@common/utils/common'
import { updateListMusics } from '@renderer/store/list/action'
import { appSetting } from '@renderer/store/setting'
import { saveLyric } from '@renderer/utils/ipc'
import { getLocalFilePath } from '@renderer/utils/music'
import { requestMsg } from '@renderer/utils/message'

import {
  buildLyricInfo,
  type CancelableTask,
  type MusicUrlTaskOptions,
  createGetOtherSourceByTimeoutTask,
  createGetOtherSourceTask,
  getCachedLyricInfo,
  getCurrentResolvedSourceMusicInfo,
  getOnlineOtherSourceLyricByLocal,
  getOnlineOtherSourceLyricInfo,
  getOnlineOtherSourceMusicUrlTask,
  getOnlineOtherSourceMusicUrlByLocalTask,
  getOnlineOtherSourcePicByLocal,
  getOnlineOtherSourcePicUrl,
  LOCAL_FALLBACK_CACHE_QUALITY,
  saveCachedMusicUrl,
} from './utils'
import { getLyricInfo as getOnlineLyricInfo } from './online'

const noop = () => {}
const getLocalMetadataTaskOptions = (): MusicUrlTaskOptions => {
  return {
    urlTimeout: getSourceSearchTimeoutWithBufferMs(appSetting['common.sourceSearchTimeout']),
    otherSourceTimeout: getSourceSearchTimeoutMs(appSetting['common.sourceSearchTimeout']),
  }
}

const createOtherSourceFetcher = (timeout?: number) => {
  if (typeof timeout != 'number' || timeout <= 0) return (musicInfo: LX.Music.MusicInfoLocal) => createGetOtherSourceTask(musicInfo)
  const startTime = Date.now()
  return (musicInfo: LX.Music.MusicInfoLocal) => {
    const remainTimeout = timeout - (Date.now() - startTime)
    if (remainTimeout <= 0) {
      return {
        promise: Promise.reject(new Error('find music timeout')),
        cancel: noop,
      }
    }
    return createGetOtherSourceByTimeoutTask(musicInfo, remainTimeout)
  }
}

const getOtherSourceByLocal = async<T>(
  musicInfo: LX.Music.MusicInfoLocal,
  handler: (infos: LX.Music.MusicInfoOnline[]) => Promise<T>,
  taskOptions?: MusicUrlTaskOptions,
  isCancelled: () => boolean = () => false,
  setTaskCancel: (cancel: () => void) => void = noop,
) => {
  const fetchOtherSource = createOtherSourceFetcher(taskOptions?.otherSourceTimeout)
  const throwIfCancelled = () => {
    if (isCancelled()) throw new Error(requestMsg.cancelRequest)
  }
  const requestOtherSource = async(searchMusicInfo: LX.Music.MusicInfoLocal) => {
    const task = fetchOtherSource(searchMusicInfo)
    setTaskCancel(task.cancel)
    try {
      return await task.promise
    } finally {
      setTaskCancel(noop)
    }
  }
  let result: LX.Music.MusicInfoOnline[] = []
  throwIfCancelled()
  result = await requestOtherSource(musicInfo)
  throwIfCancelled()
  if (result.length) {
    try {
      return await handler(result)
    } catch (err: any) {
      if (err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
    }
  }
  if (musicInfo.name.includes('-')) {
    const [name, singer] = musicInfo.name.split('-').map(val => val.trim())
    throwIfCancelled()
    result = await requestOtherSource({
      ...musicInfo,
      name,
      singer,
    })
    throwIfCancelled()
    if (result.length) {
      try {
        return await handler(result)
      } catch (err: any) {
        if (err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
      }
    }
    throwIfCancelled()
    result = await requestOtherSource({
      ...musicInfo,
      name: singer,
      singer: name,
    })
    throwIfCancelled()
    if (result.length) {
      try {
        return await handler(result)
      } catch (err: any) {
        if (err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
      }
    }
  }
  let fileName = musicInfo.meta.filePath.split(/\/|\\/).at(-1)
  if (fileName) {
    fileName = fileName.substring(0, fileName.lastIndexOf('.'))
    if (fileName != musicInfo.name) {
      if (fileName.includes('-')) {
        const [name, singer] = fileName.split('-').map(val => val.trim())
        throwIfCancelled()
        result = await requestOtherSource({
          ...musicInfo,
          name,
          singer,
        })
        throwIfCancelled()
        if (result.length) {
          try {
            return await handler(result)
          } catch (err: any) {
            if (err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
          }
        }
        throwIfCancelled()
        result = await requestOtherSource({
          ...musicInfo,
          name: singer,
          singer: name,
        })
      } else {
        throwIfCancelled()
        result = await requestOtherSource({
          ...musicInfo,
          name: fileName,
          singer: '',
        })
      }
      throwIfCancelled()
      if (result.length) {
        try {
          return await handler(result)
        } catch (err: any) {
          if (err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
        }
      }
    }
  }

  throw new Error('source not found')
}

export const getMusicUrl = async({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {}, taskOptions }: {
  musicInfo: LX.Music.MusicInfoLocal
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  taskOptions?: MusicUrlTaskOptions
}): Promise<string> => {
  return createGetMusicUrlTask({ musicInfo, isRefresh, allowToggleSource, onToggleSource, taskOptions }).promise
}

export const createGetMusicUrlTask = ({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {}, onResolvedMusicInfo, taskOptions }: {
  musicInfo: LX.Music.MusicInfoLocal
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  onResolvedMusicInfo?: (musicInfo: LX.Music.MusicInfoLocal | LX.Music.MusicInfoOnline) => void
  taskOptions?: MusicUrlTaskOptions
}): CancelableTask<string> => {
  let isCancelled = false
  let cancelTask = () => {}
  return {
    cancel() {
      isCancelled = true
      cancelTask()
    },
    promise: (async() => {
      const cacheSourceId = appSetting['common.apiSource']
      if (!isRefresh) {
        const path = await getLocalFilePath(musicInfo)
        if (path) {
          onResolvedMusicInfo?.(musicInfo)
          return encodePath(path)
        }
      }

      try {
        const task = getOnlineOtherSourceMusicUrlByLocalTask(musicInfo, isRefresh, taskOptions)
        cancelTask = task.cancel
        const { url, quality, musicInfo: resolvedMusicInfo, isFromCache } = await task.promise
        if (isCancelled) throw new Error(requestMsg.cancelRequest)
        onResolvedMusicInfo?.(resolvedMusicInfo)
        if (!isFromCache) {
          void saveCachedMusicUrl(
            musicInfo,
            quality,
            url,
            cacheSourceId,
            resolvedMusicInfo.source == 'local' ? null : resolvedMusicInfo,
          )
        }
        return url
      } catch (err: any) {
        if (err.message == requestMsg.cancelRequest) throw err
      }

      if (!allowToggleSource) throw new Error('failed')
      if (isCancelled) throw new Error(requestMsg.cancelRequest)

      onToggleSource()
      return getOtherSourceByLocal(musicInfo, async(otherSource) => {
        const task = getOnlineOtherSourceMusicUrlTask({ musicInfos: [...otherSource], onToggleSource, isRefresh, taskOptions })
        cancelTask = task.cancel
        const { url, quality: targetQuality, musicInfo: targetMusicInfo, isFromCache } = await task.promise
        if (isCancelled) throw new Error(requestMsg.cancelRequest)
        onResolvedMusicInfo?.(targetMusicInfo)
        if (!isFromCache) {
          void saveCachedMusicUrl(targetMusicInfo, targetQuality, url, cacheSourceId, targetMusicInfo)
          void saveCachedMusicUrl(musicInfo, LOCAL_FALLBACK_CACHE_QUALITY, url, cacheSourceId, targetMusicInfo)
        }
        return url
      }, taskOptions, () => isCancelled, (cancel) => {
        cancelTask = cancel
      })
    })(),
  }
}

export const getPicUrl = async({ musicInfo, listId, isRefresh, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoLocal
  listId?: string | null
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  const taskOptions = getLocalMetadataTaskOptions()
  if (!isRefresh) {
    const pic = await window.lx.worker.main.getMusicFilePic(musicInfo.meta.filePath)
    if (pic) return pic

    if (musicInfo.meta.picUrl) return musicInfo.meta.picUrl
  }

  try {
    return await getOnlineOtherSourcePicByLocal(musicInfo, taskOptions).then(({ url }) => {
      return url
    })
  } catch {}

  onToggleSource()
  return getOtherSourceByLocal(musicInfo, async(otherSource) => {
    return getOnlineOtherSourcePicUrl({
      musicInfos: [...otherSource],
      onToggleSource,
      isRefresh,
      taskOptions,
    }).then(({ url, musicInfo: targetMusicInfo, isFromCache }) => {
      if (listId) {
        musicInfo.meta.picUrl = url
        void updateListMusics([{ id: listId, musicInfo }])
      }

      return url
    })
  }, taskOptions)
}

export const getLyricInfo = async({ musicInfo, isRefresh, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoLocal
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  const taskOptions = getLocalMetadataTaskOptions()
  let lyricInfo: LX.Player.LyricInfo | null = null
  if (!isRefresh) {
    const fileLyricInfoTask = window.lx.worker.main.getMusicFileLyric(musicInfo.meta.filePath)
    lyricInfo = await getCachedLyricInfo(musicInfo)
    const fileLyricInfo = await fileLyricInfoTask
    // console.log(lyricInfo, fileLyricInfo)
    if (lyricInfo?.lyric && lyricInfo.lyric != fileLyricInfo?.lyric) {
      // 存在已编辑歌词
      return buildLyricInfo({ ...lyricInfo, rawlrcInfo: fileLyricInfo ?? lyricInfo.rawlrcInfo })
    }

    if (fileLyricInfo) return buildLyricInfo(fileLyricInfo)
  } else {
    const fileLyricInfo = await window.lx.worker.main.getMusicFileLyric(musicInfo.meta.filePath)
    if (fileLyricInfo) return buildLyricInfo(fileLyricInfo)
  }

  const resolvedMusicInfo = getCurrentResolvedSourceMusicInfo(musicInfo)
  if (resolvedMusicInfo) {
    try {
      const resolvedLyricInfo = await getOnlineLyricInfo({
        musicInfo: resolvedMusicInfo,
        isRefresh,
        onToggleSource,
        allowToggleSource: false,
      })
      void saveLyric(musicInfo, resolvedLyricInfo)
      return resolvedLyricInfo
    } catch (err: any) {
      if (err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
    }
  }

  if (!isRefresh && lyricInfo) return buildLyricInfo(lyricInfo)

  try {
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return await getOnlineOtherSourceLyricByLocal(musicInfo, isRefresh, taskOptions).then(({ lyricInfo, isFromCache }) => {
      if (!isFromCache) void saveLyric(musicInfo, lyricInfo)
      return buildLyricInfo(lyricInfo)
    })
  } catch {}

  onToggleSource()
  return getOtherSourceByLocal(musicInfo, async(otherSource) => {
    return getOnlineOtherSourceLyricInfo({
      musicInfos: [...otherSource],
      onToggleSource,
      isRefresh,
      taskOptions,
    }).then(async({ lyricInfo, musicInfo: targetMusicInfo, isFromCache }) => {
      void saveLyric(musicInfo, lyricInfo)

      if (isFromCache) return buildLyricInfo(lyricInfo)
      void saveLyric(targetMusicInfo, lyricInfo)

      return buildLyricInfo(lyricInfo)
    })
  }, taskOptions)
}
