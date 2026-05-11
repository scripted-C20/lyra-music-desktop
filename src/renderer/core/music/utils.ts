import { qualityList } from '@renderer/store'
import { assertApiSupport } from '@renderer/store/utils'
import musicSdk from '@renderer/utils/musicSdk'
import { getSourceSearchTimeoutMs } from '@common/constants'
import {
  // getOtherSource as getOtherSourceFromStore,
  // saveOtherSource as saveOtherSourceFromStore,
  getMusicUrl as getStoreMusicUrl,
  getPlayerLyric as getStoreLyric,
} from '@renderer/utils/ipc'
import { appSetting } from '@renderer/store/setting'
import { langS2T, toNewMusicInfo, toOldMusicInfo } from '@renderer/utils'
import { requestMsg } from '@renderer/utils/message'
import { apis } from '@renderer/utils/musicSdk/api-source'
import { createVerifyPlayableUrlTask } from '@renderer/utils/verifyPlayableUrl'


const getOtherSourcePromises = new Map()
const otherSourceCache = new Map<LX.Music.MusicInfo | LX.Download.ListItem, LX.Music.MusicInfoOnline[]>()
export const existTimeExp = /\[\d{1,2}:.*\d{1,4}\]/
const noop = () => {}

export interface CancelableTask<T> {
  promise: Promise<T>
  cancel: () => void
}
export interface MusicUrlTaskOptions {
  urlTimeout?: number
  otherSourceTimeout?: number
  skipUserApiVerify?: boolean
}

export const isUserApiSourceSelected = () => /^user_api/.test(appSetting['common.apiSource'])
export const canUseMusicUrlCache = (isRefresh: boolean) => !isRefresh && !isUserApiSourceSelected()
export const getSourceSearchTimeoutMilliseconds = () => getSourceSearchTimeoutMs(appSetting['common.sourceSearchTimeout'])
const USER_API_PLAY_VERIFY_MIN_TIMEOUT = 6_000
const USER_API_PLAY_VERIFY_MAX_TIMEOUT = 12_000
const USER_API_PLAY_VERIFY_MIN_PROGRESS = 0.15
const USER_API_PLAY_VERIFY_MIN_PLAY_TIME = 800

const createCancelledError = () => new Error(requestMsg.cancelRequest)
const getUserApiPlaybackVerifyTimeout = () => {
  return Math.max(USER_API_PLAY_VERIFY_MIN_TIMEOUT, Math.min(USER_API_PLAY_VERIFY_MAX_TIMEOUT, getSourceSearchTimeoutMilliseconds()))
}
const verifyPlayableUrlIfNeeded = async(
  url: string,
  setCancel: (cancel: () => void) => void,
  throwIfCancelled: () => void,
  skipUserApiVerify = false,
) => {
  if (skipUserApiVerify) return
  if (!isUserApiSourceSelected() || !/^https?:/i.test(url)) return
  const verifyTask = createVerifyPlayableUrlTask(url, {
    timeout: getUserApiPlaybackVerifyTimeout(),
    minProgress: USER_API_PLAY_VERIFY_MIN_PROGRESS,
    minPlayTime: USER_API_PLAY_VERIFY_MIN_PLAY_TIME,
    failedMessage: requestMsg.fail,
    timeoutMessage: requestMsg.timeout,
    cancelMessage: requestMsg.cancelRequest,
  })
  setCancel(verifyTask.cancel)
  await verifyTask.promise
  setCancel(noop)
  throwIfCancelled()
}
const createRejectedTask = <T>(error: unknown): CancelableTask<T> => {
  return {
    promise: Promise.reject(error),
    cancel: noop,
  }
}
const getTaskCancel = (task: any) => {
  return typeof task?.cancel == 'function'
    ? task.cancel.bind(task)
    : typeof task?.cancelHttp == 'function'
      ? task.cancelHttp.bind(task)
      : typeof task?.canceleFn == 'function'
        ? task.canceleFn.bind(task)
        : noop
}
const createTaskTimeout = <T>(task: CancelableTask<T>, timeout: number, message: string = requestMsg.timeout): CancelableTask<T> => createCancelableTask(async({ setCancel, throwIfCancelled }) => {
  let timeoutId: NodeJS.Timeout | null = null
  const clearTaskTimeout = () => {
    if (!timeoutId) return
    clearTimeout(timeoutId)
    timeoutId = null
  }

  setCancel(() => {
    clearTaskTimeout()
    task.cancel()
  })

  try {
    const result = await new Promise<T>((resolve, reject) => {
      timeoutId = setTimeout(() => {
        timeoutId = null
        task.cancel()
        reject(new Error(message))
      }, timeout)
      task.promise.then(resolve).catch(reject)
    })
    throwIfCancelled()
    return result
  } finally {
    clearTaskTimeout()
  }
})
const applyTaskTimeout = <T>(task: CancelableTask<T>, timeout?: number): CancelableTask<T> => {
  return typeof timeout == 'number' && timeout > 0 ? createTaskTimeout(task, timeout) : task
}
const normalizeCancelableTask = <T>(task: any): CancelableTask<T> => {
  if (!task) {
    return createRejectedTask(new Error('task is empty'))
  }
  const cancel = getTaskCancel(task)
  if (typeof task.then == 'function') {
    return {
      promise: task as Promise<T>,
      cancel,
    }
  }
  const promise = typeof task.promise?.then == 'function'
    ? task.promise as Promise<T>
    : Promise.resolve(task as T)
  return {
    promise,
    cancel,
  }
}
const createCancelableTask = <T>(executor: (helpers: {
  setCancel: (cancel: () => void) => void
  throwIfCancelled: () => void
  isCancelled: () => boolean
}) => Promise<T>): CancelableTask<T> => {
  let cancelled = false
  let currentCancel = noop
  const setCancel = (cancel: () => void) => {
    currentCancel = cancel
    if (cancelled) {
      currentCancel()
      currentCancel = noop
    }
  }
  const isCancelled = () => cancelled
  const throwIfCancelled = () => {
    if (cancelled) throw createCancelledError()
  }
  return {
    cancel() {
      cancelled = true
      currentCancel()
      currentCancel = noop
    },
    promise: executor({
      setCancel,
      throwIfCancelled,
      isCancelled,
    }),
  }
}
const createMusicUrlRequestTask = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality): CancelableTask<{ url: string, type: LX.Quality }> => {
  try {
    return normalizeCancelableTask(musicSdk[musicInfo.source].getMusicUrl(toOldMusicInfo(musicInfo), quality))
  } catch (err) {
    return createRejectedTask(err)
  }
}
const createLocalMusicUrlRequestTask = (musicInfo: LX.Music.MusicInfoLocal): CancelableTask<{ url: string }> => {
  try {
    return normalizeCancelableTask(apis('local').getMusicUrl(toOldMusicInfo(musicInfo), null))
  } catch (err) {
    return createRejectedTask(err)
  }
}

const getOtherSourceSearchContext = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  if ('progress' in musicInfo) {
    return {
      key: `local_${musicInfo.id}`,
      searchMusicInfo: {
        name: musicInfo.metadata.musicInfo.name,
        singer: musicInfo.metadata.musicInfo.singer,
        source: musicInfo.metadata.musicInfo.source,
        albumName: musicInfo.metadata.musicInfo.meta.albumName,
        interval: musicInfo.metadata.musicInfo.interval ?? '',
      },
    }
  }
  return {
    key: `${musicInfo.source}_${musicInfo.id}`,
    searchMusicInfo: {
      name: musicInfo.name,
      singer: musicInfo.singer,
      source: musicInfo.source,
      albumName: musicInfo.meta.albumName,
      interval: musicInfo.interval ?? '',
    },
  }
}

const createSearchOtherSourceTask = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): CancelableTask<LX.Music.MusicInfoOnline[]> => createCancelableTask(async({ setCancel, throwIfCancelled }) => {
  if (otherSourceCache.has(musicInfo)) return otherSourceCache.get(musicInfo)!
  const { searchMusicInfo } = getOtherSourceSearchContext(musicInfo)
  const task = normalizeCancelableTask<LX.Music.MusicInfoOnline[]>(musicSdk.findMusic(searchMusicInfo))
  setCancel(task.cancel)
  const otherSource = await task.promise
  throwIfCancelled()
  if (otherSourceCache.size > 10) otherSourceCache.clear()
  const source: LX.Music.MusicInfoOnline[] = otherSource.map(item => toNewMusicInfo(item) as LX.Music.MusicInfoOnline)
  otherSourceCache.set(musicInfo, source)
  return source
})

export const createGetOtherSourceTask = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): CancelableTask<LX.Music.MusicInfoOnline[]> => {
  return createSearchOtherSourceTask(musicInfo)
}

export const createGetOtherSourceByTimeoutTask = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, timeout?: number): CancelableTask<LX.Music.MusicInfoOnline[]> => {
  const task = createGetOtherSourceTask(musicInfo)
  return typeof timeout == 'number' && timeout > 0
    ? createTaskTimeout(task, timeout, 'find music timeout')
    : task
}

export const getOtherSource = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh = false): Promise<LX.Music.MusicInfoOnline[]> => {
  // if (!isRefresh && musicInfo.id) {
  //   const cachedInfo = await getOtherSourceFromStore(musicInfo.id)
  //   if (cachedInfo.length) return cachedInfo
  // }
  if (otherSourceCache.has(musicInfo)) return otherSourceCache.get(musicInfo)!
  const { key, searchMusicInfo } = getOtherSourceSearchContext(musicInfo)
  if (getOtherSourcePromises.has(key)) return getOtherSourcePromises.get(key)

  const promise = new Promise<LX.Music.MusicInfoOnline[]>((resolve, reject) => {
    let timeout: null | NodeJS.Timeout = setTimeout(() => {
      timeout = null
      reject(new Error('find music timeout'))
    }, getSourceSearchTimeoutMilliseconds())
    musicSdk.findMusic(searchMusicInfo).then((otherSource) => {
      if (otherSourceCache.size > 10) otherSourceCache.clear()
      const source = otherSource.map(toNewMusicInfo) as LX.Music.MusicInfoOnline[]
      otherSourceCache.set(musicInfo, source)
      resolve(source)
    }).catch(reject).finally(() => {
      if (timeout) clearTimeout(timeout)
    })
  }).then((otherSource) => {
    // if (otherSource.length) void saveOtherSourceFromStore(musicInfo.id, otherSource)
    return otherSource
  }).finally(() => {
    if (getOtherSourcePromises.has(key)) getOtherSourcePromises.delete(key)
  })
  getOtherSourcePromises.set(key, promise)
  return promise
}

export const getOtherSourceByTimeout = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, timeout?: number): Promise<LX.Music.MusicInfoOnline[]> => {
  if (typeof timeout != 'number' || timeout <= 0) return getOtherSource(musicInfo)
  let timeoutId: NodeJS.Timeout | null = null
  try {
    return await Promise.race([
      getOtherSource(musicInfo),
      new Promise<LX.Music.MusicInfoOnline[]>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          timeoutId = null
          reject(new Error('find music timeout'))
        }, timeout)
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}


export const buildLyricInfo = async(lyricInfo: MakeOptional<LX.Player.LyricInfo, 'rawlrcInfo'>): Promise<LX.Player.LyricInfo> => {
  if (!appSetting['player.isS2t']) {
    // @ts-expect-error
    if (lyricInfo.rawlrcInfo) return lyricInfo
    return { ...lyricInfo, rawlrcInfo: { ...lyricInfo } }
  }

  if (appSetting['player.isS2t']) {
    const tasks = [
      lyricInfo.lyric ? langS2T(lyricInfo.lyric) : Promise.resolve(''),
      lyricInfo.tlyric ? langS2T(lyricInfo.tlyric) : Promise.resolve(''),
      lyricInfo.rlyric ? langS2T(lyricInfo.rlyric) : Promise.resolve(''),
      lyricInfo.lxlyric ? langS2T(lyricInfo.lxlyric) : Promise.resolve(''),
    ]
    if (lyricInfo.rawlrcInfo) {
      tasks.push(lyricInfo.lyric ? langS2T(lyricInfo.lyric) : Promise.resolve(''))
      tasks.push(lyricInfo.tlyric ? langS2T(lyricInfo.tlyric) : Promise.resolve(''))
      tasks.push(lyricInfo.rlyric ? langS2T(lyricInfo.rlyric) : Promise.resolve(''))
      tasks.push(lyricInfo.lxlyric ? langS2T(lyricInfo.lxlyric) : Promise.resolve(''))
    }
    return Promise.all(tasks).then(([lyric, tlyric, rlyric, lxlyric, lyric_raw, tlyric_raw, rlyric_raw, lxlyric_raw]) => {
      const rawlrcInfo = lyric_raw ? {
        lyric: lyric_raw,
        tlyric: tlyric_raw,
        rlyric: rlyric_raw,
        lxlyric: lxlyric_raw,
      } : {
        lyric,
        tlyric,
        rlyric,
        lxlyric,
      }
      return {
        lyric,
        tlyric,
        rlyric,
        lxlyric,
        rawlrcInfo,
      }
    })
  }

  // @ts-expect-error
  return lyricInfo.rawlrcInfo ? lyricInfo : { ...lyricInfo, rawlrcInfo: { ...lyricInfo } }
}

export const getCachedLyricInfo = async(musicInfo: LX.Music.MusicInfo): Promise<LX.Player.LyricInfo | null> => {
  let lrcInfo = await getStoreLyric(musicInfo)
  // lrcInfo = {} as unknown as LX.Player.LyricInfo
  if (existTimeExp.test(lrcInfo.lyric)) {
    if (lrcInfo.tlyric != null) {
      // if (musicInfo.lrc.startsWith('\ufeff[id:$00000000]')) {
      //   let str = musicInfo.lrc.replace('\ufeff[id:$00000000]\n', '')
      //   commit('setLrc', { musicInfo, lyric: str, tlyric: musicInfo.tlrc, lxlyric: musicInfo.tlrc })
      // } else if (musicInfo.lrc.startsWith('[id:$00000000]')) {
      //   let str = musicInfo.lrc.replace('[id:$00000000]\n', '')
      //   commit('setLrc', { musicInfo, lyric: str, tlyric: musicInfo.tlrc, lxlyric: musicInfo.tlrc })
      // }

      if (lrcInfo.lxlyric == null) {
        switch (musicInfo.source) { // 以下源支持lxlyric 重新获取
          case 'kg':
          case 'kw':
          case 'mg':
          case 'wy':
          case 'tx':
            break
          default:
            return lrcInfo
        }
      } else if (lrcInfo.rlyric == null) {
        // 以下源支持 rlyric 重新获取
        if (!['wy', 'kg', 'tx'].includes(musicInfo.source)) return lrcInfo
      } else return lrcInfo
    }
    if (musicInfo.source == 'local') return lrcInfo
  }
  return null
}

export const getOnlineOtherSourceMusicUrlByLocal = async(musicInfo: LX.Music.MusicInfoLocal, isRefresh: boolean, taskOptions?: MusicUrlTaskOptions): Promise<{
  url: string
  quality: LX.Quality
  isFromCache: boolean
}> => {
  return getOnlineOtherSourceMusicUrlByLocalTask(musicInfo, isRefresh, taskOptions).promise
}

export const getOnlineOtherSourceMusicUrlByLocalTask = (musicInfo: LX.Music.MusicInfoLocal, isRefresh: boolean, taskOptions?: MusicUrlTaskOptions): CancelableTask<{
  url: string
  quality: LX.Quality
  isFromCache: boolean
}> => createCancelableTask(async({ setCancel, throwIfCancelled }) => {
  if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')

  const quality = '128k'

  const cachedUrl = await getStoreMusicUrl(musicInfo, quality)
  if (cachedUrl && canUseMusicUrlCache(isRefresh)) return { url: cachedUrl, quality, isFromCache: true }

  const task = applyTaskTimeout(createLocalMusicUrlRequestTask(musicInfo), taskOptions?.urlTimeout)
  setCancel(task.cancel)
  const { url } = await task.promise
  throwIfCancelled()
  await verifyPlayableUrlIfNeeded(url, setCancel, throwIfCancelled, taskOptions?.skipUserApiVerify)

  return { url, quality, isFromCache: false }
})

export const getOnlineOtherSourceLyricByLocal = async(musicInfo: LX.Music.MusicInfoLocal, isRefresh: boolean): Promise<{
  lyricInfo: LX.Music.LyricInfo
  isFromCache: boolean
}> => {
  if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')

  const lyricInfo = await getCachedLyricInfo(musicInfo)
  if (lyricInfo && !isRefresh) return { lyricInfo, isFromCache: true }

  let reqPromise
  try {
    reqPromise = apis('local').getLyric(toOldMusicInfo(musicInfo)).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }

  return reqPromise.then((lyricInfo: LX.Music.LyricInfo) => {
    return { lyricInfo, isFromCache: false }
  })
}

export const getOnlineOtherSourcePicByLocal = async(musicInfo: LX.Music.MusicInfoLocal): Promise<{
  url: string
}> => {
  if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')

  let reqPromise
  try {
    reqPromise = apis('local').getPic(toOldMusicInfo(musicInfo)).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }

  return reqPromise.then((url: string) => {
    return { url }
  })
}

export const TRY_QUALITYS_LIST = ['flac24bit', 'flac', '320k'] as const
type TryQualityType = typeof TRY_QUALITYS_LIST[number]
export const getPlayQuality = (highQuality: LX.Quality, musicInfo: LX.Music.MusicInfoOnline): LX.Quality => {
  let type: LX.Quality = '128k'
  if (TRY_QUALITYS_LIST.includes(highQuality as TryQualityType)) {
    let list = qualityList.value[musicInfo.source]

    let t = TRY_QUALITYS_LIST
      .slice(TRY_QUALITYS_LIST.indexOf(highQuality as TryQualityType))
      .find(q => musicInfo.meta._qualitys[q] && list?.includes(q))

    if (t) type = t
  }
  return type
}

export const getOnlineOtherSourceMusicUrl = async({ musicInfos, quality, onToggleSource, isRefresh, retryedSource = [], taskOptions }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  quality?: LX.Quality
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
  taskOptions?: MusicUrlTaskOptions
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
}> => {
  return getOnlineOtherSourceMusicUrlTask({ musicInfos, quality, onToggleSource, isRefresh, retryedSource, taskOptions }).promise
}

export const getOnlineOtherSourceMusicUrlTask = ({ musicInfos, quality, onToggleSource, isRefresh, retryedSource = [], taskOptions }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  quality?: LX.Quality
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
  taskOptions?: MusicUrlTaskOptions
}): CancelableTask<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
}> => createCancelableTask(async({ setCancel, throwIfCancelled }) => {
  if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')

  let musicInfo: LX.Music.MusicInfoOnline | null = null
  let itemQuality: LX.Quality | null = null
  // eslint-disable-next-line no-cond-assign
  while (musicInfo = (musicInfos.shift()!)) {
    if (retryedSource.includes(musicInfo.source)) continue
    retryedSource.push(musicInfo.source)
    if (!assertApiSupport(musicInfo.source)) continue
    itemQuality = quality ?? getPlayQuality(appSetting['player.playQuality'], musicInfo)
    if (!musicInfo.meta._qualitys[itemQuality]) continue

    console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
    onToggleSource(musicInfo)
    break
  }
  if (!musicInfo || !itemQuality) throw new Error(window.i18n.t('toggle_source_failed'))
  throwIfCancelled()

  const cachedUrl = await getStoreMusicUrl(musicInfo, itemQuality)
  if (cachedUrl && canUseMusicUrlCache(isRefresh)) return { url: cachedUrl, musicInfo, quality: itemQuality, isFromCache: true }

  const task = createMusicUrlRequestTask(musicInfo, itemQuality)
  const timedTask = applyTaskTimeout(task, taskOptions?.urlTimeout)
  setCancel(timedTask.cancel)
  try {
    const { url, type } = await timedTask.promise
    throwIfCancelled()
    await verifyPlayableUrlIfNeeded(url, setCancel, throwIfCancelled, taskOptions?.skipUserApiVerify)
    return { musicInfo, url, quality: type, isFromCache: false }
  } catch (err: any) {
    if (err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
    console.log(err)
    const nextTask = getOnlineOtherSourceMusicUrlTask({ musicInfos, quality, onToggleSource, isRefresh, retryedSource, taskOptions })
    setCancel(nextTask.cancel)
    return nextTask.promise
  }
})

/**
 * 获取在线音乐URL
 */
export const handleGetOnlineMusicUrl = async({ musicInfo, quality, onToggleSource, isRefresh, allowToggleSource, taskOptions }: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource: boolean
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  taskOptions?: MusicUrlTaskOptions
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
}> => {
  return handleGetOnlineMusicUrlTask({ musicInfo, quality, onToggleSource, isRefresh, allowToggleSource, taskOptions }).promise
}

export const handleGetOnlineMusicUrlTask = ({ musicInfo, quality, onToggleSource, isRefresh, allowToggleSource, taskOptions }: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource: boolean
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  taskOptions?: MusicUrlTaskOptions
}): CancelableTask<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
}> => createCancelableTask(async({ setCancel, throwIfCancelled }) => {
  if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')
  // console.log(musicInfo.source)
  const targetQuality = quality ?? getPlayQuality(appSetting['player.playQuality'], musicInfo)

  const cachedUrl = await getStoreMusicUrl(musicInfo, targetQuality)
  if (cachedUrl && canUseMusicUrlCache(isRefresh)) return { musicInfo, url: cachedUrl, quality: targetQuality, isFromCache: true }

  const task = applyTaskTimeout(createMusicUrlRequestTask(musicInfo, targetQuality), taskOptions?.urlTimeout)
  setCancel(task.cancel)
  try {
    const { url, type } = await task.promise
    throwIfCancelled()
    await verifyPlayableUrlIfNeeded(url, setCancel, throwIfCancelled, taskOptions?.skipUserApiVerify)
    return { musicInfo, url, quality: type, isFromCache: false }
  } catch (err: any) {
    console.log(err)
    if (!allowToggleSource || err.message == requestMsg.cancelRequest || err.message == requestMsg.tooManyRequests) throw err
    throwIfCancelled()
    onToggleSource()
    let otherSource: LX.Music.MusicInfoOnline[]
    try {
      const otherSourceTask = createGetOtherSourceByTimeoutTask(musicInfo, taskOptions?.otherSourceTimeout)
      setCancel(otherSourceTask.cancel)
      otherSource = await otherSourceTask.promise
    } catch {
      throw err
    }
    throwIfCancelled()
    console.log('find otherSource', otherSource)
    if (otherSource.length) {
      const nextTask = getOnlineOtherSourceMusicUrlTask({
        musicInfos: [...otherSource],
        onToggleSource,
        quality,
        isRefresh,
        retryedSource: [musicInfo.source],
        taskOptions,
      })
      setCancel(nextTask.cancel)
      return nextTask.promise
    }
    throw err
  }
})


export const getOnlineOtherSourcePicUrl = async({ musicInfos, onToggleSource, isRefresh, retryedSource = [] }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  let musicInfo: LX.Music.MusicInfoOnline | null = null
  // eslint-disable-next-line no-cond-assign
  while (musicInfo = (musicInfos.shift()!)) {
    if (retryedSource.includes(musicInfo.source)) continue
    retryedSource.push(musicInfo.source)
    // if (!assertApiSupport(musicInfo.source)) continue
    console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
    onToggleSource(musicInfo)
    break
  }
  if (!musicInfo) throw new Error(window.i18n.t('toggle_source_failed'))

  if (musicInfo.meta.picUrl && !isRefresh) return { musicInfo, url: musicInfo.meta.picUrl, isFromCache: true }

  let reqPromise
  try {
    reqPromise = musicSdk[musicInfo.source].getPic(toOldMusicInfo(musicInfo))
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }
  // retryedSource.includes(musicInfo.source)
  return reqPromise.then((url: string) => {
    return { musicInfo, url, isFromCache: false }
    // eslint-disable-next-line @typescript-eslint/promise-function-async
  }).catch((err: any) => {
    console.log(err)
    return getOnlineOtherSourcePicUrl({ musicInfos, onToggleSource, isRefresh, retryedSource })
  })
}

/**
 * 获取在线歌曲封面
 */
export const handleGetOnlinePicUrl = async({ musicInfo, isRefresh, onToggleSource, allowToggleSource }: {
  musicInfo: LX.Music.MusicInfoOnline
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  allowToggleSource: boolean
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  // console.log(musicInfo.source)
  let reqPromise
  try {
    reqPromise = musicSdk[musicInfo.source].getPic(toOldMusicInfo(musicInfo))
  } catch (err) {
    reqPromise = Promise.reject(err)
  }
  return reqPromise.then((url: string) => {
    return { musicInfo, url, isFromCache: false }
  }).catch(async(err: any) => {
    console.log(err)
    if (!allowToggleSource) throw err
    onToggleSource()
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return getOtherSource(musicInfo).then(otherSource => {
      console.log('find otherSource', otherSource)
      if (otherSource.length) {
        return getOnlineOtherSourcePicUrl({
          musicInfos: [...otherSource],
          onToggleSource,
          isRefresh,
          retryedSource: [musicInfo.source],
        })
      }
      throw err
    })
  })
}


export const getOnlineOtherSourceLyricInfo = async({ musicInfos, onToggleSource, isRefresh, retryedSource = [] }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
}): Promise<{
  lyricInfo: LX.Music.LyricInfo | LX.Player.LyricInfo
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  let musicInfo: LX.Music.MusicInfoOnline | null = null
  // eslint-disable-next-line no-cond-assign
  while (musicInfo = (musicInfos.shift()!)) {
    if (retryedSource.includes(musicInfo.source)) continue
    retryedSource.push(musicInfo.source)
    // if (!assertApiSupport(musicInfo.source)) continue
    console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
    onToggleSource(musicInfo)
    break
  }
  if (!musicInfo) throw new Error(window.i18n.t('toggle_source_failed'))

  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo)
    if (lyricInfo) return { musicInfo, lyricInfo, isFromCache: true }
  }

  let reqPromise
  try {
    // TODO: remove any type
    reqPromise = (musicSdk[musicInfo.source].getLyric(toOldMusicInfo(musicInfo)) as any).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }
  // retryedSource.includes(musicInfo.source)
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  return reqPromise.then((lyricInfo: LX.Music.LyricInfo) => {
    return existTimeExp.test(lyricInfo.lyric) ? {
      lyricInfo,
      musicInfo,
      isFromCache: false,
    } : Promise.reject(new Error('failed'))
    // eslint-disable-next-line @typescript-eslint/promise-function-async
  }).catch((err: any) => {
    console.log(err)
    return getOnlineOtherSourceLyricInfo({ musicInfos, onToggleSource, isRefresh, retryedSource })
  })
}

/**
 * 获取在线歌词信息
 */
export const handleGetOnlineLyricInfo = async({ musicInfo, onToggleSource, isRefresh, allowToggleSource }: {
  musicInfo: LX.Music.MusicInfoOnline
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  allowToggleSource: boolean
}): Promise<{
  musicInfo: LX.Music.MusicInfoOnline
  lyricInfo: LX.Music.LyricInfo | LX.Player.LyricInfo
  isFromCache: boolean
}> => {
  // console.log(musicInfo.source)
  let reqPromise
  try {
    // TODO: remove any type
    reqPromise = (musicSdk[musicInfo.source].getLyric(toOldMusicInfo(musicInfo)) as any).promise
  } catch (err) {
    reqPromise = Promise.reject(err)
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  return reqPromise.then((lyricInfo: LX.Music.LyricInfo) => {
    return existTimeExp.test(lyricInfo.lyric) ? {
      musicInfo,
      lyricInfo,
      isFromCache: false,
    } : Promise.reject(new Error('failed'))
  }).catch(async(err: any) => {
    console.log(err)
    if (!allowToggleSource) throw err

    onToggleSource()
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return getOtherSource(musicInfo).then(otherSource => {
      console.log('find otherSource', otherSource)
      if (otherSource.length) {
        return getOnlineOtherSourceLyricInfo({
          musicInfos: [...otherSource],
          onToggleSource,
          isRefresh,
          retryedSource: [musicInfo.source],
        })
      }
      throw err
    })
  })
}
