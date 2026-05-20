import { qualityList } from '@renderer/store'
import { assertApiSupport } from '@renderer/store/utils'
import musicSdk from '@renderer/utils/musicSdk'
import { getSourceSearchTimeoutMs } from '@common/constants'
import {
  // getOtherSource as getOtherSourceFromStore,
  // saveOtherSource as saveOtherSourceFromStore,
  getMusicUrl as getStoreMusicUrl,
  getPlayerLyric as getStoreLyric,
  saveMusicUrl as saveStoreMusicUrl,
} from '@renderer/utils/ipc'
import { appSetting } from '@renderer/store/setting'
import { langS2T, toNewMusicInfo, toOldMusicInfo } from '@renderer/utils'
import { requestMsg } from '@renderer/utils/message'
import { apis } from '@renderer/utils/musicSdk/api-source'
import { createVerifyPlayableUrlTask } from '@renderer/utils/verifyPlayableUrl'
import { getPreferredResolvedSourceMusicInfo } from '@renderer/core/player/runtimeSourceMemory'
import { getPendingResolvedMusicInfo } from '@renderer/core/player/musicUrlState'
import { createMusicUrlCacheId } from '@renderer/utils/musicUrlCache'


const getOtherSourcePromises = new Map()
const otherSourceCache = new Map<LX.Music.MusicInfo | LX.Download.ListItem, LX.Music.MusicInfoOnline[]>()
export const existTimeExp = /\[\d{1,2}:.*\d{1,4}\]/
const hasLyricText = (text?: string | null): text is string => typeof text == 'string' && text.trim().length > 0
const hasUsableLyricInfo = (lyricInfo?: Partial<LX.Music.LyricInfo | LX.Player.LyricInfo> | null) => {
  if (!lyricInfo) return false
  return [lyricInfo.lyric, lyricInfo.tlyric, lyricInfo.rlyric, lyricInfo.lxlyric].some(hasLyricText)
}
const hasTimeTagLyricInfo = (lyricInfo?: Partial<LX.Music.LyricInfo | LX.Player.LyricInfo> | null) => {
  if (!lyricInfo) return false
  return [lyricInfo.lyric, lyricInfo.tlyric, lyricInfo.rlyric, lyricInfo.lxlyric]
    .some(text => {
      if (!hasLyricText(text)) return false
      return existTimeExp.test(text)
    })
}
const noop = () => {}

export interface CancelableTask<T> {
  promise: Promise<T>
  cancel: () => void
}
export interface MusicUrlTaskOptions {
  urlTimeout?: number
  otherSourceTimeout?: number
  skipUserApiVerify?: boolean
  userApiVerifyMode?: 'light' | 'strict'
  skipSharedCache?: boolean
  allowTooManyRequestsFallback?: boolean
  excludedMusicInfos?: Array<Pick<LX.Music.MusicInfo, 'source' | 'id'>>
}

export const isUserApiSourceSelected = () => /^user_api/.test(appSetting['common.apiSource'])
export const canUseMusicUrlCache = (isRefresh: boolean) => !isRefresh
export const getSourceSearchTimeoutMilliseconds = () => getSourceSearchTimeoutMs(appSetting['common.sourceSearchTimeout'])
export const LOCAL_FALLBACK_CACHE_QUALITY: LX.Quality = '128k'
const SHARED_MUSIC_URL_CACHE_SOURCE_ID = null
const STRICT_TOGGLE_SOURCE_META_KEY = '__strictToggleSource'
const STRICT_TOGGLE_SOURCE_INTERVAL_META_KEY = '__strictToggleSourceInterval'
const USER_API_PLAY_VERIFY_MIN_TIMEOUT = 6_000
const USER_API_PLAY_VERIFY_MAX_TIMEOUT = 12_000
const USER_API_PLAY_VERIFY_MIN_PROGRESS = 1.2
const USER_API_PLAY_VERIFY_MIN_PLAY_TIME = 1_500
const USER_API_PLAY_VERIFY_MIN_TIMEUPDATE_COUNT = 2
const CACHED_MUSIC_URL_RESOLVED_SOURCE_MAX = 500
const OTHER_SOURCE_GROUP_CONCURRENCY = 2

type MusicInfoLike = LX.Music.MusicInfo | LX.Download.ListItem
type ResolvedSourceTrustMode = 'candidate' | 'memory' | 'strict'
interface CachedMusicUrlInfo {
  url: string
  cacheSourceId: string | null
  resolvedMusicInfo: LX.Music.MusicInfoOnline | null
}

const getMusicUrlCacheBaseMusicInfo = (musicInfo: MusicInfoLike): LX.Music.MusicInfo => {
  return 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
}
const getMusicInfoMeta = (
  musicInfo: MusicInfoLike | LX.Music.MusicInfoOnline | null | undefined,
): Record<string, any> | null => {
  if (!musicInfo) return null
  const targetMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  return targetMusicInfo.meta as Record<string, any> | null
}
const MUSIC_INFO_TEXT_FILTER_REGEXP = /[\s'"`~!！@#$%^&*()（）\-_=+[\]{}\\|;:：,.<>/?，。、&]+/g
const MUSIC_INFO_SINGER_SPLIT_REGEXP = /、|&|;|；|\/|,|，|\|| feat\.? | ft\.? | x |×/i
const normalizeMusicInfoText = (text?: string | null) => {
  return typeof text == 'string'
    ? text.trim().toLowerCase().replace(MUSIC_INFO_TEXT_FILTER_REGEXP, '')
    : ''
}
const getNormalizedTextLengthRatio = (sourceText: string, targetText: string) => {
  if (!sourceText || !targetText) return 0
  const minLength = Math.min(sourceText.length, targetText.length)
  const maxLength = Math.max(sourceText.length, targetText.length)
  return maxLength ? minLength / maxLength : 0
}
const normalizeMusicInfoSinger = (text?: string | null) => {
  const singer = typeof text == 'string' ? text.trim().toLowerCase() : ''
  if (!singer) return ''
  return singer
    .split(MUSIC_INFO_SINGER_SPLIT_REGEXP)
    .map(item => normalizeMusicInfoText(item))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join('|')
}
const parseMusicInfoIntervalSeconds = (interval?: string | number | null) => {
  if (typeof interval == 'number') {
    if (!Number.isFinite(interval) || interval <= 0) return null
    return Math.round(interval > 1000 ? interval / 1000 : interval)
  }
  if (typeof interval != 'string') return null
  const targetInterval = interval.trim()
  if (!targetInterval) return null
  if (/^\d+$/.test(targetInterval)) {
    const value = parseInt(targetInterval, 10)
    if (!Number.isFinite(value) || value <= 0) return null
    return value > 1000 ? Math.round(value / 1000) : value
  }
  const parts = targetInterval.split(':')
  let total = 0
  let unit = 1
  while (parts.length) {
    const value = parseInt(parts.pop()!.trim(), 10)
    if (!Number.isFinite(value) || value < 0) return null
    total += value * unit
    unit *= 60
  }
  return total > 0 ? total : null
}
const getMusicInfoIntervalDiffSeconds = (sourceInterval?: string | number | null, targetInterval?: string | number | null) => {
  const sourceSeconds = parseMusicInfoIntervalSeconds(sourceInterval)
  const targetSeconds = parseMusicInfoIntervalSeconds(targetInterval)
  if (sourceSeconds == null || targetSeconds == null) return null
  return Math.abs(sourceSeconds - targetSeconds)
}
const isComparableNormalizedTextMatch = (sourceText: string, targetText: string) => {
  return !!sourceText && !!targetText && (
    sourceText == targetText ||
    sourceText.includes(targetText) ||
    targetText.includes(sourceText)
  )
}
const isComparableNormalizedTextStrongMatch = (sourceText: string, targetText: string) => {
  if (!isComparableNormalizedTextMatch(sourceText, targetText)) return false
  if (sourceText == targetText) return true
  const minLength = Math.min(sourceText.length, targetText.length)
  const maxLength = Math.max(sourceText.length, targetText.length)
  if (!maxLength) return false
  return minLength / maxLength >= 0.6
}
const isComparableNormalizedSingerMatch = (sourceSinger: string, targetSinger: string) => {
  if (!sourceSinger || !targetSinger) return false
  if (sourceSinger == targetSinger) return true
  const sourceList = sourceSinger.split('|').filter(Boolean)
  const targetList = targetSinger.split('|').filter(Boolean)
  if (!sourceList.length || !targetList.length) return false
  return sourceList.every(item => targetList.includes(item)) ||
    targetList.every(item => sourceList.includes(item))
}
export const getTrustedResolvedSourceMusicInfo = (
  musicInfo: MusicInfoLike,
  resolvedMusicInfo?: LX.Music.MusicInfoOnline | null,
  mode: ResolvedSourceTrustMode = 'candidate',
) => {
  if (!resolvedMusicInfo) return null
  const baseMusicInfo = getMusicUrlCacheBaseMusicInfo(musicInfo)
  if (baseMusicInfo.source != 'local' && isSameOnlineMusicInfo(baseMusicInfo, resolvedMusicInfo)) {
    return resolvedMusicInfo
  }

  const baseName = normalizeMusicInfoText(baseMusicInfo.name)
  const resolvedName = normalizeMusicInfoText(resolvedMusicInfo.name)
  if (!isComparableNormalizedTextStrongMatch(baseName, resolvedName)) return null

  const intervalDiff = getMusicInfoIntervalDiffSeconds(baseMusicInfo.interval, resolvedMusicInfo.interval)
  if (intervalDiff != null && intervalDiff > 5) return null

  const baseSinger = normalizeMusicInfoSinger(baseMusicInfo.singer)
  const resolvedSinger = normalizeMusicInfoSinger(resolvedMusicInfo.singer)
  const singerMatch = isComparableNormalizedSingerMatch(baseSinger, resolvedSinger)
  const exactSingerMatch = !!baseSinger && !!resolvedSinger && baseSinger == resolvedSinger
  const albumMatch = isComparableNormalizedTextStrongMatch(
    normalizeMusicInfoText(baseMusicInfo.meta.albumName),
    normalizeMusicInfoText(resolvedMusicInfo.meta.albumName),
  )
  const exactNameMatch = baseName == resolvedName
  const nameLengthRatio = getNormalizedTextLengthRatio(baseName, resolvedName)
  const closeInterval = intervalDiff == null || intervalDiff <= 3
  const strictInterval = intervalDiff == null || intervalDiff <= 2
  const hasBaseSinger = !!baseSinger
  const isStrictMode = mode == 'strict' || isManualToggleSourceMusicInfo(baseMusicInfo)

  if (mode == 'memory' || isStrictMode) {
    if (!isComparableNormalizedTextStrongMatch(baseName, resolvedName)) return null
    if (nameLengthRatio < (isStrictMode ? 0.85 : 0.75)) return null
    if (intervalDiff != null && intervalDiff > (isStrictMode ? 2 : 3)) return null

    if (hasBaseSinger) {
      if (!singerMatch) return null
      if (exactNameMatch) return resolvedMusicInfo
      if (strictInterval && (albumMatch || exactSingerMatch)) return resolvedMusicInfo
      if (!isStrictMode && closeInterval && albumMatch) return resolvedMusicInfo
      return null
    }

    if (exactNameMatch && strictInterval) return resolvedMusicInfo
    if (albumMatch && strictInterval) return resolvedMusicInfo
    return null
  }

  if (singerMatch && (exactNameMatch || closeInterval || albumMatch)) return resolvedMusicInfo
  if (!baseSinger && (closeInterval || albumMatch)) return resolvedMusicInfo
  if (exactNameMatch && albumMatch && closeInterval) return resolvedMusicInfo

  return null
}
export const markManualToggleSourceMusicInfo = <T extends LX.Music.MusicInfoOnline>(musicInfo: T): T => {
  const targetMeta = getMusicInfoMeta(musicInfo)
  if (!targetMeta) return musicInfo
  targetMeta[STRICT_TOGGLE_SOURCE_META_KEY] = true
  targetMeta[STRICT_TOGGLE_SOURCE_INTERVAL_META_KEY] = musicInfo.interval ?? ''
  return musicInfo
}
export const isManualToggleSourceMusicInfo = (
  musicInfo: MusicInfoLike | LX.Music.MusicInfoOnline | null | undefined,
) => {
  return !!getMusicInfoMeta(musicInfo)?.[STRICT_TOGGLE_SOURCE_META_KEY]
}
export const isMusicInfoDurationMismatched = (
  musicInfo: MusicInfoLike | LX.Music.MusicInfoOnline | null | undefined,
  duration: number,
  maxDiffSeconds = 8,
  options: {
    requireManualToggle?: boolean
  } = {},
) => {
  if ((options.requireManualToggle ?? true) && !isManualToggleSourceMusicInfo(musicInfo)) return false
  if (!Number.isFinite(duration) || duration <= 0) return false
  const targetMusicInfo = musicInfo && ('progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo)
  if (!targetMusicInfo) return false
  const expectedInterval = getMusicInfoMeta(musicInfo)?.[STRICT_TOGGLE_SOURCE_INTERVAL_META_KEY] ?? targetMusicInfo.interval
  const expectedSeconds = parseMusicInfoIntervalSeconds(expectedInterval)
  if (expectedSeconds == null) return false
  return Math.abs(expectedSeconds - duration) > maxDiffSeconds
}

const createCancelledError = () => new Error(requestMsg.cancelRequest)
const getUserApiPlaybackVerifyTimeout = () => {
  return Math.max(USER_API_PLAY_VERIFY_MIN_TIMEOUT, Math.min(USER_API_PLAY_VERIFY_MAX_TIMEOUT, getSourceSearchTimeoutMilliseconds()))
}
export const createPlaybackVerifyTask = (url: string, options: Partial<{
  timeout: number
  failedMessage: string
  timeoutMessage: string
  cancelMessage: string
}> = {}) => {
  return createVerifyPlayableUrlTask(url, {
    timeout: options.timeout ?? getUserApiPlaybackVerifyTimeout(),
    minProgress: USER_API_PLAY_VERIFY_MIN_PROGRESS,
    minPlayTime: USER_API_PLAY_VERIFY_MIN_PLAY_TIME,
    minTimeupdateCount: USER_API_PLAY_VERIFY_MIN_TIMEUPDATE_COUNT,
    failedMessage: options.failedMessage ?? requestMsg.fail,
    timeoutMessage: options.timeoutMessage ?? requestMsg.timeout,
    cancelMessage: options.cancelMessage ?? requestMsg.cancelRequest,
  })
}
export const createLightPlaybackVerifyTask = (url: string, options: Partial<{
  timeout: number
  failedMessage: string
  timeoutMessage: string
  cancelMessage: string
}> = {}) => {
  return createVerifyPlayableUrlTask(url, {
    timeout: options.timeout ?? getUserApiPlaybackVerifyTimeout(),
    failedMessage: options.failedMessage ?? requestMsg.fail,
    timeoutMessage: options.timeoutMessage ?? requestMsg.timeout,
    cancelMessage: options.cancelMessage ?? requestMsg.cancelRequest,
  })
}
const verifyPlayableUrlIfNeeded = async(
  url: string,
  setCancel: (cancel: () => void) => void,
  throwIfCancelled: () => void,
  skipUserApiVerify = false,
  verifyMode: MusicUrlTaskOptions['userApiVerifyMode'] = 'strict',
) => {
  if (skipUserApiVerify) return
  if (!isUserApiSourceSelected() || !/^https?:/i.test(url)) return
  const verifyTask = verifyMode == 'light'
    ? createLightPlaybackVerifyTask(url)
    : createPlaybackVerifyTask(url)
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
const cachedMusicUrlResolvedSourceMap = new Map<string, LX.Music.MusicInfoOnline>()
const cleanupCachedMusicUrlResolvedSourceMap = () => {
  while (cachedMusicUrlResolvedSourceMap.size > CACHED_MUSIC_URL_RESOLVED_SOURCE_MAX) {
    const firstKey = cachedMusicUrlResolvedSourceMap.keys().next().value
    if (!firstKey) break
    cachedMusicUrlResolvedSourceMap.delete(firstKey)
  }
}
const getMusicUrlCacheSourceIds = (
  sourceId = appSetting['common.apiSource'],
  options?: Pick<MusicUrlTaskOptions, 'skipSharedCache'>,
) => {
  const ids: Array<string | null> = options?.skipSharedCache ? [] : [SHARED_MUSIC_URL_CACHE_SOURCE_ID]
  if (sourceId != null && sourceId !== '') ids.unshift(sourceId)
  return Array.from(new Set(ids))
}
const rememberCachedMusicUrlResolvedSource = (
  musicInfo: MusicInfoLike,
  quality: LX.Quality,
  resolvedMusicInfo: LX.Music.MusicInfoOnline,
  sourceId = appSetting['common.apiSource'],
) => {
  const targetMusicInfo = getMusicUrlCacheBaseMusicInfo(musicInfo)
  for (const cacheSourceId of getMusicUrlCacheSourceIds(sourceId)) {
    cachedMusicUrlResolvedSourceMap.set(createMusicUrlCacheId(targetMusicInfo, quality, cacheSourceId), resolvedMusicInfo)
  }
  cleanupCachedMusicUrlResolvedSourceMap()
}
export const getCachedMusicUrlInfo = async(
  musicInfo: MusicInfoLike,
  quality: LX.Quality,
  sourceId = appSetting['common.apiSource'],
  options?: Pick<MusicUrlTaskOptions, 'skipSharedCache' | 'excludedMusicInfos'>,
): Promise<CachedMusicUrlInfo | null> => {
  const targetMusicInfo = getMusicUrlCacheBaseMusicInfo(musicInfo)
  for (const cacheSourceId of getMusicUrlCacheSourceIds(sourceId, options)) {
    const cachedUrl = await getStoreMusicUrl(targetMusicInfo, quality, cacheSourceId)
    if (!cachedUrl) continue
    const rememberedResolvedMusicInfo = cachedMusicUrlResolvedSourceMap.get(createMusicUrlCacheId(targetMusicInfo, quality, cacheSourceId)) ??
      getPreferredResolvedSourceMusicInfo(musicInfo, sourceId) ??
      null
    const resolvedMusicInfo = getTrustedResolvedSourceMusicInfo(musicInfo, rememberedResolvedMusicInfo, 'memory')
    if (rememberedResolvedMusicInfo && !resolvedMusicInfo) continue
    if (isExcludedComparableMusicInfo(resolvedMusicInfo ?? musicInfo, options)) continue
    return {
      url: cachedUrl,
      cacheSourceId,
      resolvedMusicInfo,
    }
  }
  return null
}
export const getCachedMusicUrl = async(
  musicInfo: MusicInfoLike,
  quality: LX.Quality,
  sourceId = appSetting['common.apiSource'],
  options?: Pick<MusicUrlTaskOptions, 'skipSharedCache' | 'excludedMusicInfos'>,
) => {
  return (await getCachedMusicUrlInfo(musicInfo, quality, sourceId, options))?.url ?? ''
}
export const saveCachedMusicUrl = async(
  musicInfo: MusicInfoLike,
  quality: LX.Quality,
  url: string,
  sourceId = appSetting['common.apiSource'],
  resolvedMusicInfo?: LX.Music.MusicInfoOnline | null,
) => {
  if (!url) return
  const targetMusicInfo = getMusicUrlCacheBaseMusicInfo(musicInfo)
  const trustMode: ResolvedSourceTrustMode = isManualToggleSourceMusicInfo(musicInfo) ? 'strict' : 'memory'
  const trustedResolvedMusicInfo = resolvedMusicInfo ? getTrustedResolvedSourceMusicInfo(musicInfo, resolvedMusicInfo, trustMode) : null
  if (trustedResolvedMusicInfo) rememberCachedMusicUrlResolvedSource(musicInfo, quality, trustedResolvedMusicInfo, sourceId)
  await Promise.all(getMusicUrlCacheSourceIds(sourceId).map(cacheSourceId => {
    return saveStoreMusicUrl(targetMusicInfo, quality, url, cacheSourceId)
  }))
}
const tryUseCachedMusicUrlInfo = async(
  musicInfo: MusicInfoLike,
  quality: LX.Quality,
  isRefresh: boolean,
  sourceId = appSetting['common.apiSource'],
  taskOptions: MusicUrlTaskOptions | undefined,
  setCancel: (cancel: () => void) => void,
  throwIfCancelled: () => void,
): Promise<CachedMusicUrlInfo | null> => {
  const cachedUrlInfo = await getCachedMusicUrlInfo(musicInfo, quality, sourceId, taskOptions)
  if (!cachedUrlInfo || !canUseMusicUrlCache(isRefresh)) return null
  try {
    await verifyPlayableUrlIfNeeded(
      cachedUrlInfo.url,
      setCancel,
      throwIfCancelled,
      taskOptions?.skipUserApiVerify,
      taskOptions?.userApiVerifyMode,
    )
    setCancel(noop)
    return cachedUrlInfo
  } catch (err: any) {
    setCancel(noop)
    if (err.message == requestMsg.cancelRequest) throw err
  }
  return null
}
export const isSameOnlineMusicInfo = (
  sourceMusicInfo?: Pick<LX.Music.MusicInfoOnline, 'source' | 'id'> | null,
  targetMusicInfo?: Pick<LX.Music.MusicInfoOnline, 'source' | 'id'> | null,
) => {
  return !!sourceMusicInfo && !!targetMusicInfo &&
    sourceMusicInfo.source == targetMusicInfo.source &&
    sourceMusicInfo.id == targetMusicInfo.id
}
export const getCurrentResolvedSourceMusicInfo = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const baseMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  const trustMode: ResolvedSourceTrustMode = isManualToggleSourceMusicInfo(baseMusicInfo) ? 'strict' : 'memory'
  const resolvedMusicInfo = getTrustedResolvedSourceMusicInfo(
    musicInfo,
    getPendingResolvedMusicInfo(musicInfo) ?? getPreferredResolvedSourceMusicInfo(musicInfo),
    trustMode,
  )
  if (!resolvedMusicInfo) return null
  if (baseMusicInfo.source != 'local' && isSameOnlineMusicInfo(baseMusicInfo, resolvedMusicInfo)) return null
  return resolvedMusicInfo
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
const isSameResolvedMusicInfo = (
  sourceMusicInfo?: Partial<Pick<LX.Music.MusicInfo, 'source' | 'id'>> | null,
  targetMusicInfo?: Partial<Pick<LX.Music.MusicInfo, 'source' | 'id'>> | null,
) => {
  return !!sourceMusicInfo && !!targetMusicInfo &&
    sourceMusicInfo.source == targetMusicInfo.source &&
    sourceMusicInfo.id == targetMusicInfo.id
}
const normalizeComparableMusicInfo = (
  musicInfo: MusicInfoLike | LX.Music.MusicInfoOnline | null | undefined,
): Pick<LX.Music.MusicInfo, 'source' | 'id'> | null => {
  if (!musicInfo) return null
  const targetMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  if (!targetMusicInfo.source || !targetMusicInfo.id) return null
  return {
    source: targetMusicInfo.source,
    id: targetMusicInfo.id,
  }
}
const isExcludedComparableMusicInfo = (
  musicInfo: MusicInfoLike | LX.Music.MusicInfoOnline | null | undefined,
  taskOptions?: Pick<MusicUrlTaskOptions, 'excludedMusicInfos'>,
) => {
  const comparableMusicInfo = normalizeComparableMusicInfo(musicInfo)
  if (!comparableMusicInfo) return false
  return taskOptions?.excludedMusicInfos?.some(item => isSameResolvedMusicInfo(item, comparableMusicInfo)) ?? false
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
const createMusicPicRequestTask = (musicInfo: LX.Music.MusicInfoOnline): CancelableTask<string> => {
  try {
    return normalizeCancelableTask<string>(musicSdk[musicInfo.source].getPic(toOldMusicInfo(musicInfo)))
  } catch (err) {
    return createRejectedTask(err)
  }
}
const createMusicLyricRequestTask = (musicInfo: LX.Music.MusicInfoOnline): CancelableTask<LX.Music.LyricInfo> => {
  try {
    return normalizeCancelableTask<LX.Music.LyricInfo>((musicSdk[musicInfo.source].getLyric(toOldMusicInfo(musicInfo)) as any))
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
const createLocalLyricRequestTask = (musicInfo: LX.Music.MusicInfoLocal): CancelableTask<LX.Music.LyricInfo> => {
  try {
    return normalizeCancelableTask<LX.Music.LyricInfo>(apis('local').getLyric(toOldMusicInfo(musicInfo)))
  } catch (err) {
    return createRejectedTask(err)
  }
}
const createLocalPicRequestTask = (musicInfo: LX.Music.MusicInfoLocal): CancelableTask<string> => {
  try {
    return normalizeCancelableTask<string>(apis('local').getPic(toOldMusicInfo(musicInfo)))
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
  if (!hasUsableLyricInfo(lrcInfo)) return null
  if (hasTimeTagLyricInfo(lrcInfo)) {
    if (lrcInfo.tlyric == null) return lrcInfo
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
    return null
  }
  return lrcInfo
}

export const getOnlineOtherSourceMusicUrlByLocal = async(musicInfo: LX.Music.MusicInfoLocal, isRefresh: boolean, taskOptions?: MusicUrlTaskOptions): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoLocal | LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
}> => {
  return getOnlineOtherSourceMusicUrlByLocalTask(musicInfo, isRefresh, taskOptions).promise
}

export const getOnlineOtherSourceMusicUrlByLocalTask = (musicInfo: LX.Music.MusicInfoLocal, isRefresh: boolean, taskOptions?: MusicUrlTaskOptions): CancelableTask<{
  url: string
  musicInfo: LX.Music.MusicInfoLocal | LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
}> => createCancelableTask(async({ setCancel, throwIfCancelled }) => {
  if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')

  const quality = LOCAL_FALLBACK_CACHE_QUALITY
  const cacheSourceId = appSetting['common.apiSource']

  const cachedUrlInfo = await tryUseCachedMusicUrlInfo(
    musicInfo,
    quality,
    isRefresh,
    cacheSourceId,
    taskOptions,
    setCancel,
    throwIfCancelled,
  )
  if (cachedUrlInfo) {
    return {
      url: cachedUrlInfo.url,
      musicInfo: cachedUrlInfo.resolvedMusicInfo ?? musicInfo,
      quality,
      isFromCache: true,
    }
  }

  if (isExcludedComparableMusicInfo(musicInfo, taskOptions)) throw new Error(window.i18n.t('toggle_source_failed'))

  const task = applyTaskTimeout(createLocalMusicUrlRequestTask(musicInfo), taskOptions?.urlTimeout)
  setCancel(task.cancel)
  const { url } = await task.promise
  throwIfCancelled()
  await verifyPlayableUrlIfNeeded(
    url,
    setCancel,
    throwIfCancelled,
    taskOptions?.skipUserApiVerify,
    taskOptions?.userApiVerifyMode,
  )

  return { url, musicInfo, quality, isFromCache: false }
})

export const getOnlineOtherSourceLyricByLocal = async(musicInfo: LX.Music.MusicInfoLocal, isRefresh: boolean, taskOptions?: MusicUrlTaskOptions): Promise<{
  lyricInfo: LX.Music.LyricInfo
  isFromCache: boolean
}> => {
  if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')

  const lyricInfo = await getCachedLyricInfo(musicInfo)
  if (lyricInfo && !isRefresh) return { lyricInfo, isFromCache: true }

  const task = applyTaskTimeout(createLocalLyricRequestTask(musicInfo), taskOptions?.urlTimeout)
  return task.promise.then((lyricInfo: LX.Music.LyricInfo) => {
    if (!hasUsableLyricInfo(lyricInfo)) throw new Error('failed')
    return { lyricInfo, isFromCache: false }
  })
}

export const getOnlineOtherSourcePicByLocal = async(musicInfo: LX.Music.MusicInfoLocal, taskOptions?: MusicUrlTaskOptions): Promise<{
  url: string
}> => {
  if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')

  const task = applyTaskTimeout(createLocalPicRequestTask(musicInfo), taskOptions?.urlTimeout)
  return task.promise.then((url: string) => {
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

const getOtherSourceMusicCandidateKey = (musicInfo: LX.Music.MusicInfoOnline) => `${musicInfo.source}_${musicInfo.id}`
const groupOtherSourceMusicCandidates = (
  originMusicInfo: MusicInfoLike | null | undefined,
  musicInfos: LX.Music.MusicInfoOnline[],
  skipSources: LX.OnlineSource[],
) => {
  const seenCandidates = new Set<string>()
  const sourceGroups = new Map<LX.OnlineSource, LX.Music.MusicInfoOnline[]>()
  const orderedGroups: Array<{
    source: LX.OnlineSource
    musicInfos: LX.Music.MusicInfoOnline[]
  }> = []
  for (const musicInfo of musicInfos) {
    if (skipSources.includes(musicInfo.source)) continue
    if (!assertApiSupport(musicInfo.source)) continue
    if (originMusicInfo && !getTrustedResolvedSourceMusicInfo(originMusicInfo, musicInfo)) continue
    const candidateKey = getOtherSourceMusicCandidateKey(musicInfo)
    if (seenCandidates.has(candidateKey)) continue
    seenCandidates.add(candidateKey)
    let sourceMusicInfos = sourceGroups.get(musicInfo.source)
    if (!sourceMusicInfos) {
      sourceMusicInfos = []
      sourceGroups.set(musicInfo.source, sourceMusicInfos)
      orderedGroups.push({
        source: musicInfo.source,
        musicInfos: sourceMusicInfos,
      })
    }
    sourceMusicInfos.push(musicInfo)
  }
  return orderedGroups
}

export const getOnlineOtherSourceMusicUrlTask = ({ musicInfos, quality, onToggleSource, isRefresh, retryedSource = [], originMusicInfo, taskOptions }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  quality?: LX.Quality
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
  originMusicInfo?: MusicInfoLike
  taskOptions?: MusicUrlTaskOptions
}): CancelableTask<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
}> => createCancelableTask(async({ setCancel, throwIfCancelled }) => {
  if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')
  const cacheSourceId = appSetting['common.apiSource']

  const sourceGroups = groupOtherSourceMusicCandidates(
    originMusicInfo,
    musicInfos.filter(item => !isExcludedComparableMusicInfo(item, taskOptions)),
    retryedSource,
  )
  if (!sourceGroups.length) throw new Error(window.i18n.t('toggle_source_failed'))

  const createSourceGroupTask = (sourceMusicInfos: LX.Music.MusicInfoOnline[]) => createCancelableTask<{
    url: string
    musicInfo: LX.Music.MusicInfoOnline
    quality: LX.Quality
    isFromCache: boolean
  }>(async({ setCancel: setGroupCancel, throwIfCancelled: throwIfGroupCancelled }) => {
    let currentSourceMusicInfo: LX.Music.MusicInfoOnline | null = null
    let lastError: Error | null = null
    let hasTriedCandidate = false
    for (const musicInfo of sourceMusicInfos) {
      const itemQuality = quality ?? getPlayQuality(appSetting['player.playQuality'], musicInfo)
      if (!musicInfo.meta._qualitys[itemQuality]) continue
      if (!currentSourceMusicInfo) {
        currentSourceMusicInfo = musicInfo
        console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
        onToggleSource(musicInfo)
      }
      throwIfGroupCancelled()
      hasTriedCandidate = true

      const cachedUrlInfo = await tryUseCachedMusicUrlInfo(
        musicInfo,
        itemQuality,
        isRefresh,
        cacheSourceId,
        taskOptions,
        setGroupCancel,
        throwIfGroupCancelled,
      )
      if (cachedUrlInfo) {
        return {
          url: cachedUrlInfo.url,
          musicInfo: cachedUrlInfo.resolvedMusicInfo ?? musicInfo,
          quality: itemQuality,
          isFromCache: true,
        }
      }

      const task = createMusicUrlRequestTask(musicInfo, itemQuality)
      const timedTask = applyTaskTimeout(task, taskOptions?.urlTimeout)
      setGroupCancel(timedTask.cancel)
      try {
        const { url, type } = await timedTask.promise
        throwIfGroupCancelled()
        await verifyPlayableUrlIfNeeded(
          url,
          setGroupCancel,
          throwIfGroupCancelled,
          taskOptions?.skipUserApiVerify,
          taskOptions?.userApiVerifyMode,
        )
        return { musicInfo, url, quality: type, isFromCache: false }
      } catch (err: any) {
        if (err.message == requestMsg.cancelRequest) throw err
        console.log(err)
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }
    if (lastError) throw lastError
    if (!hasTriedCandidate) throw new Error(window.i18n.t('toggle_source_failed'))
    throw new Error(window.i18n.t('toggle_source_failed'))
  })

  const maxConcurrency = Math.max(1, Math.min(OTHER_SOURCE_GROUP_CONCURRENCY, sourceGroups.length))
  const activeTasks = new Set<CancelableTask<{
    url: string
    musicInfo: LX.Music.MusicInfoOnline
    quality: LX.Quality
    isFromCache: boolean
  }>>()
  setCancel(() => {
    for (const task of activeTasks) task.cancel()
  })

  let nextIndex = 0
  let activeCount = 0
  let settled = false
  let lastError: Error | null = null

  return await new Promise<{
    url: string
    musicInfo: LX.Music.MusicInfoOnline
    quality: LX.Quality
    isFromCache: boolean
  }>((resolve, reject) => {
    const finishWithError = (error?: Error | null) => {
      if (settled) return
      settled = true
      for (const task of activeTasks) task.cancel()
      activeTasks.clear()
      reject(error ?? new Error(window.i18n.t('toggle_source_failed')))
    }
    const launchNext = () => {
      if (settled) return
      while (activeCount < maxConcurrency && nextIndex < sourceGroups.length) {
        const groupTask = createSourceGroupTask(sourceGroups[nextIndex++].musicInfos)
        activeTasks.add(groupTask)
        activeCount++
        void groupTask.promise.then(result => {
          activeTasks.delete(groupTask)
          activeCount--
          if (settled) return
          settled = true
          for (const task of activeTasks) task.cancel()
          activeTasks.clear()
          resolve(result)
        }).catch((err: any) => {
          activeTasks.delete(groupTask)
          activeCount--
          if (settled) return
          if (err.message == requestMsg.cancelRequest) {
            finishWithError(err)
            return
          }
          lastError = err instanceof Error ? err : new Error(String(err))
          if (nextIndex < sourceGroups.length) {
            launchNext()
            return
          }
          if (activeCount === 0) finishWithError(lastError)
        })
      }
      if (!activeCount && nextIndex >= sourceGroups.length) finishWithError(lastError)
    }

    launchNext()
  })
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
  const cacheSourceId = appSetting['common.apiSource']
  const isCurrentMusicInfoExcluded = isExcludedComparableMusicInfo(musicInfo, taskOptions)

  if (!isCurrentMusicInfoExcluded) {
    const cachedUrlInfo = await tryUseCachedMusicUrlInfo(
      musicInfo,
      targetQuality,
      isRefresh,
      cacheSourceId,
      taskOptions,
      setCancel,
      throwIfCancelled,
    )
    if (cachedUrlInfo) {
      return {
        musicInfo: cachedUrlInfo.resolvedMusicInfo ?? musicInfo,
        url: cachedUrlInfo.url,
        quality: targetQuality,
        isFromCache: true,
      }
    }
  }

  try {
    if (isCurrentMusicInfoExcluded) throw new Error(window.i18n.t('toggle_source_failed'))
    const task = applyTaskTimeout(createMusicUrlRequestTask(musicInfo, targetQuality), taskOptions?.urlTimeout)
    setCancel(task.cancel)
    const { url, type } = await task.promise
    throwIfCancelled()
    await verifyPlayableUrlIfNeeded(
      url,
      setCancel,
      throwIfCancelled,
      taskOptions?.skipUserApiVerify,
      taskOptions?.userApiVerifyMode,
    )
    return { musicInfo, url, quality: type, isFromCache: false }
  } catch (err: any) {
    console.log(err)
    if (!allowToggleSource ||
      err.message == requestMsg.cancelRequest ||
      (err.message == requestMsg.tooManyRequests && !taskOptions?.allowTooManyRequestsFallback)
    ) throw err
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
        originMusicInfo: musicInfo,
        taskOptions,
      })
      setCancel(nextTask.cancel)
      return nextTask.promise
    }
    throw err
  }
})


export const getOnlineOtherSourcePicUrl = async({ musicInfos, onToggleSource, isRefresh, retryedSource = [], originMusicInfo, taskOptions }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
  originMusicInfo?: MusicInfoLike
  taskOptions?: MusicUrlTaskOptions
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  const sourceGroups = groupOtherSourceMusicCandidates(originMusicInfo, musicInfos, retryedSource)
  let lastError: Error | null = null
  let hasTriedCandidate = false
  for (const { musicInfos: sourceMusicInfos } of sourceGroups) {
    let currentSourceMusicInfo: LX.Music.MusicInfoOnline | null = null
    for (const musicInfo of sourceMusicInfos) {
      if (!currentSourceMusicInfo) {
        currentSourceMusicInfo = musicInfo
        console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
        onToggleSource(musicInfo)
      }
      hasTriedCandidate = true
      if (musicInfo.meta.picUrl && !isRefresh) return { musicInfo, url: musicInfo.meta.picUrl, isFromCache: true }
      try {
        const task = applyTaskTimeout(createMusicPicRequestTask(musicInfo), taskOptions?.urlTimeout)
        const url = await task.promise
        return { musicInfo, url, isFromCache: false }
      } catch (err: any) {
        console.log(err)
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }
  }
  if (lastError) throw lastError
  if (!hasTriedCandidate) throw new Error(window.i18n.t('toggle_source_failed'))
  throw new Error(window.i18n.t('toggle_source_failed'))
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
  try {
    const url = await createMusicPicRequestTask(musicInfo).promise
    return { musicInfo, url, isFromCache: false }
  } catch (err: any) {
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
          originMusicInfo: musicInfo,
        })
      }
      throw err
    })
  }
}


export const getOnlineOtherSourceLyricInfo = async({ musicInfos, onToggleSource, isRefresh, retryedSource = [], originMusicInfo, taskOptions }: {
  musicInfos: LX.Music.MusicInfoOnline[]
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
  originMusicInfo?: MusicInfoLike
  taskOptions?: MusicUrlTaskOptions
}): Promise<{
  lyricInfo: LX.Music.LyricInfo | LX.Player.LyricInfo
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  const sourceGroups = groupOtherSourceMusicCandidates(originMusicInfo, musicInfos, retryedSource)
  let lastError: Error | null = null
  let hasTriedCandidate = false
  for (const { musicInfos: sourceMusicInfos } of sourceGroups) {
    let currentSourceMusicInfo: LX.Music.MusicInfoOnline | null = null
    for (const musicInfo of sourceMusicInfos) {
      if (!currentSourceMusicInfo) {
        currentSourceMusicInfo = musicInfo
        console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
        onToggleSource(musicInfo)
      }
      hasTriedCandidate = true
      if (!isRefresh) {
        const lyricInfo = await getCachedLyricInfo(musicInfo)
        if (lyricInfo) return { musicInfo, lyricInfo, isFromCache: true }
      }
      try {
        const task = applyTaskTimeout(createMusicLyricRequestTask(musicInfo), taskOptions?.urlTimeout)
        const lyricInfo = await task.promise
        if (!hasUsableLyricInfo(lyricInfo)) throw new Error('failed')
        return {
          lyricInfo,
          musicInfo,
          isFromCache: false,
        }
      } catch (err: any) {
        console.log(err)
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }
  }
  if (lastError) throw lastError
  if (!hasTriedCandidate) throw new Error(window.i18n.t('toggle_source_failed'))
  throw new Error(window.i18n.t('toggle_source_failed'))
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
  try {
    const lyricInfo = await createMusicLyricRequestTask(musicInfo).promise
    return hasUsableLyricInfo(lyricInfo) ? {
      musicInfo,
      lyricInfo,
      isFromCache: false,
    } : Promise.reject(new Error('failed'))
  } catch (err: any) {
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
          originMusicInfo: musicInfo,
        })
      }
      throw err
    })
  }
}
