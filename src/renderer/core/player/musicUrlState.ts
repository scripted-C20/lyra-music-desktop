import { appSetting } from '@renderer/store/setting'
import { getMusicIdentity, getToggleMusicIdentity } from './musicIdentity'

const PRELOADED_MUSIC_URL_TTL = 90_000
const PRELOADED_MUSIC_URL_MAX = 8

type MusicInfoLike = LX.Music.MusicInfo | LX.Download.ListItem

const preloadedMusicUrlMap = new Map<string, {
  createdAt: number
  url: string
  resolvedMusicInfo: LX.Music.MusicInfoOnline | null
}>()
const pendingResolvedMusicInfoState = {
  requestId: '',
  resolvedMusicInfo: null as LX.Music.MusicInfoOnline | null,
}

const getBaseMusicInfo = (musicInfo: MusicInfoLike) => {
  return 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
}

const isSameOnlineMusicInfo = (
  sourceMusicInfo?: Pick<LX.Music.MusicInfoOnline, 'source' | 'id'> | null,
  targetMusicInfo?: Pick<LX.Music.MusicInfoOnline, 'source' | 'id'> | null,
) => {
  return !!sourceMusicInfo && !!targetMusicInfo &&
    sourceMusicInfo.source == targetMusicInfo.source &&
    sourceMusicInfo.id == targetMusicInfo.id
}

const normalizeResolvedMusicInfo = (
  musicInfo: MusicInfoLike,
  resolvedMusicInfo: MusicInfoLike | LX.Music.MusicInfoOnline | null | undefined,
): LX.Music.MusicInfoOnline | null => {
  if (!resolvedMusicInfo) return null
  const baseMusicInfo = getBaseMusicInfo(musicInfo)
  const targetMusicInfo = getBaseMusicInfo(resolvedMusicInfo as MusicInfoLike)
  if (targetMusicInfo.source == 'local') return null
  const normalizedMusicInfo = targetMusicInfo as LX.Music.MusicInfoOnline
  if (baseMusicInfo.source != 'local' && isSameOnlineMusicInfo(baseMusicInfo as LX.Music.MusicInfoOnline, normalizedMusicInfo)) return null
  return normalizedMusicInfo
}

const cleanupExpiredPreloadedMusicUrls = () => {
  const now = Date.now()
  for (const [key, value] of preloadedMusicUrlMap.entries()) {
    if (now - value.createdAt > PRELOADED_MUSIC_URL_TTL) preloadedMusicUrlMap.delete(key)
  }
  while (preloadedMusicUrlMap.size > PRELOADED_MUSIC_URL_MAX) {
    const firstKey = preloadedMusicUrlMap.keys().next().value
    if (!firstKey) break
    preloadedMusicUrlMap.delete(firstKey)
  }
}

const getMusicUrlRequestToggleMusicInfo = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  if (/^user_api/.test(sourceId)) return null
  const targetMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  return targetMusicInfo.meta.toggleMusicInfo ?? null
}

export const createMusicUrlRequestId = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  const toggleMusicInfo = getMusicUrlRequestToggleMusicInfo(musicInfo, sourceId)
  return `${getMusicIdentity(musicInfo)}_${getToggleMusicIdentity(toggleMusicInfo)}_${sourceId}`
}

export const savePreloadedMusicUrl = (
  musicInfo: MusicInfoLike,
  url: string,
  resolvedMusicInfo?: MusicInfoLike | LX.Music.MusicInfoOnline | null,
  sourceId = appSetting['common.apiSource'],
) => {
  if (!url) return
  cleanupExpiredPreloadedMusicUrls()
  const requestId = createMusicUrlRequestId(musicInfo, sourceId)
  preloadedMusicUrlMap.set(requestId, {
    url,
    createdAt: Date.now(),
    resolvedMusicInfo: normalizeResolvedMusicInfo(musicInfo, resolvedMusicInfo),
  })
}

export const takePreloadedMusicUrl = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  cleanupExpiredPreloadedMusicUrls()
  const requestId = createMusicUrlRequestId(musicInfo, sourceId)
  const result = preloadedMusicUrlMap.get(requestId) ?? null
  if (result) preloadedMusicUrlMap.delete(requestId)
  return result ?? {
    url: '',
    resolvedMusicInfo: null,
  }
}

export const clearPreloadedMusicUrl = (musicInfo?: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  if (!musicInfo) {
    preloadedMusicUrlMap.clear()
    return
  }
  const requestId = createMusicUrlRequestId(musicInfo, sourceId)
  preloadedMusicUrlMap.delete(requestId)
}

const resetPendingResolvedMusicInfo = () => {
  pendingResolvedMusicInfoState.requestId = ''
  pendingResolvedMusicInfoState.resolvedMusicInfo = null
}

export const setPendingResolvedMusicInfo = (
  musicInfo: MusicInfoLike,
  resolvedMusicInfo: MusicInfoLike | LX.Music.MusicInfoOnline | null | undefined,
  sourceId = appSetting['common.apiSource'],
) => {
  const requestId = createMusicUrlRequestId(musicInfo, sourceId)
  const normalizedMusicInfo = normalizeResolvedMusicInfo(musicInfo, resolvedMusicInfo)
  if (!normalizedMusicInfo) {
    if (pendingResolvedMusicInfoState.requestId == requestId) resetPendingResolvedMusicInfo()
    return
  }
  pendingResolvedMusicInfoState.requestId = requestId
  pendingResolvedMusicInfoState.resolvedMusicInfo = normalizedMusicInfo
}

export const getPendingResolvedMusicInfo = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  return pendingResolvedMusicInfoState.requestId == createMusicUrlRequestId(musicInfo, sourceId)
    ? pendingResolvedMusicInfoState.resolvedMusicInfo
    : null
}

export const takePendingResolvedMusicInfo = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  const resolvedMusicInfo = getPendingResolvedMusicInfo(musicInfo, sourceId)
  if (resolvedMusicInfo) resetPendingResolvedMusicInfo()
  return resolvedMusicInfo
}

export const clearPendingResolvedMusicInfo = (musicInfo?: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  if (!musicInfo) {
    resetPendingResolvedMusicInfo()
    return
  }
  if (pendingResolvedMusicInfoState.requestId == createMusicUrlRequestId(musicInfo, sourceId)) resetPendingResolvedMusicInfo()
}
