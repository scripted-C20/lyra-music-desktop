import { updateListMusics } from '@renderer/store/list/action'
import { appSetting } from '@renderer/store/setting'
import {
  saveLyric,
} from '@renderer/utils/ipc'
import { requestMsg } from '@renderer/utils/message'
import {
  buildLyricInfo,
  getCurrentResolvedSourceMusicInfo,
  handleGetOnlineLyricInfo,
  handleGetOnlineMusicUrlTask,
  handleGetOnlinePicUrl,
  getCachedLyricInfo,
  saveCachedMusicUrl,
  type CancelableTask,
  type MusicUrlTaskOptions,
} from './utils'

/* export const setMusicUrl = ({ musicInfo, type, url }: {
  musicInfo: LX.Music.MusicInfo
  type: LX.Quality
  url: string
}) => {
  saveMusicUrl(musicInfo, type, url)
}

export const setPic = (datas: {
  listId: string
  musicInfo: LX.Music.MusicInfo
  url: string
}) => {
  datas.musicInfo.img = datas.url
  updateMusicInfo({
    listId: datas.listId,
    id: datas.musicInfo.songmid,
    data: { img: datas.url },
    musicInfo: datas.musicInfo,
  })
}
 */


export const getMusicUrl = async({ musicInfo, quality, isRefresh, allowToggleSource = true, onToggleSource = () => {}, taskOptions }: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  taskOptions?: MusicUrlTaskOptions
}): Promise<string> => {
  return createGetMusicUrlTask({ musicInfo, quality, isRefresh, allowToggleSource, onToggleSource, taskOptions }).promise
}

export const createGetMusicUrlTask = ({ musicInfo, quality, isRefresh, allowToggleSource = true, onToggleSource = () => {}, onResolvedMusicInfo, taskOptions }: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  onResolvedMusicInfo?: (musicInfo: LX.Music.MusicInfoOnline) => void
  taskOptions?: MusicUrlTaskOptions
}): CancelableTask<string> => {
  // if (!musicInfo._types[type]) {
  //   // 兼容旧版酷我源搜索列表过滤128k音质的bug
  //   if (!(musicInfo.source == 'kw' && type == '128k')) throw new Error('该歌曲没有可播放的音频')

  //   // return Promise.reject(new Error('该歌曲没有可播放的音频'))
  // }
  let isCancelled = false
  let cancelTask = () => {}
  return {
    cancel() {
      isCancelled = true
      cancelTask()
    },
    promise: (async() => {
      const cacheSourceId = appSetting['common.apiSource']
      const task = handleGetOnlineMusicUrlTask({ musicInfo, quality, onToggleSource, isRefresh, allowToggleSource, taskOptions })
      cancelTask = task.cancel
      const { url, quality: resolvedQuality, musicInfo: targetMusicInfo, isFromCache } = await task.promise
      if (isCancelled) throw new Error(requestMsg.cancelRequest)
      onResolvedMusicInfo?.(targetMusicInfo)
      if (targetMusicInfo.id != musicInfo.id && !isFromCache) void saveCachedMusicUrl(targetMusicInfo, resolvedQuality, url, cacheSourceId, targetMusicInfo)
      void saveCachedMusicUrl(musicInfo, resolvedQuality, url, cacheSourceId, targetMusicInfo)
      return url
    })(),
  }
}

export const getPicUrl = async({ musicInfo, listId, isRefresh, allowToggleSource = true, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoOnline
  listId?: string | null
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (musicInfo.meta.picUrl && !isRefresh) return musicInfo.meta.picUrl
  return handleGetOnlinePicUrl({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(({ url }) => {
    // picRequest = null
    if (listId) {
      musicInfo.meta.picUrl = url
      void updateListMusics([{ id: listId, musicInfo }])
    }
    // savePic({ musicInfo, url, listId })
    return url
  })
}
const tryGetCurrentResolvedSourceLyricInfo = async({ musicInfo, isRefresh, onToggleSource }: {
  musicInfo: LX.Music.MusicInfoOnline
  isRefresh: boolean
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
}) => {
  const resolvedMusicInfo = getCurrentResolvedSourceMusicInfo(musicInfo)
  if (!resolvedMusicInfo) return null

  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(resolvedMusicInfo)
    if (lyricInfo) {
      void saveLyric(musicInfo, lyricInfo)
      return buildLyricInfo(lyricInfo)
    }
  }

  try {
    const { lyricInfo, musicInfo: targetMusicInfo, isFromCache } = await handleGetOnlineLyricInfo({
      musicInfo: resolvedMusicInfo,
      onToggleSource,
      isRefresh,
      allowToggleSource: false,
    })
    void saveLyric(musicInfo, lyricInfo)
    if (!isFromCache) void saveLyric(targetMusicInfo, lyricInfo)
    return buildLyricInfo(lyricInfo)
  } catch (err: any) {
    if (err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
  }

  return null
}
export const getLyricInfo = async({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoOnline
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  const resolvedLyricInfo = await tryGetCurrentResolvedSourceLyricInfo({
    musicInfo,
    isRefresh,
    onToggleSource,
  })
  if (resolvedLyricInfo) return resolvedLyricInfo

  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo)
    if (lyricInfo) return buildLyricInfo(lyricInfo)
  }

  // lrcRequest = music[musicInfo.source].getLyric(musicInfo)
  return handleGetOnlineLyricInfo({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(async({ lyricInfo, musicInfo: targetMusicInfo, isFromCache }) => {
    // lrcRequest = null
    if (isFromCache) return buildLyricInfo(lyricInfo)
    if (targetMusicInfo.id == musicInfo.id) void saveLyric(musicInfo, lyricInfo)
    else void saveLyric(targetMusicInfo, lyricInfo)

    return buildLyricInfo(lyricInfo)
  })
}
