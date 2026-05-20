import { appSetting } from '@renderer/store/setting'
import { createMusicUrlRequestId } from './musicUrlState'

type MusicInfoLike = LX.Music.MusicInfo | LX.Download.ListItem
type ResolvedSourceIdentifier = Pick<LX.Music.MusicInfo, 'source' | 'id'>

const failedResolvedSourceState = {
  requestId: '',
  resolvedMusicInfos: [] as ResolvedSourceIdentifier[],
}

const isSameResolvedSourceIdentifier = (
  sourceMusicInfo?: Partial<ResolvedSourceIdentifier> | null,
  targetMusicInfo?: Partial<ResolvedSourceIdentifier> | null,
) => {
  return !!sourceMusicInfo && !!targetMusicInfo &&
    sourceMusicInfo.source == targetMusicInfo.source &&
    sourceMusicInfo.id == targetMusicInfo.id
}

const resetFailedResolvedSourceState = () => {
  failedResolvedSourceState.requestId = ''
  failedResolvedSourceState.resolvedMusicInfos = []
}

const getBaseMusicInfo = (musicInfo: MusicInfoLike) => {
  return 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
}

const normalizeResolvedSourceIdentifier = (
  musicInfo: MusicInfoLike,
  resolvedMusicInfo?: Partial<ResolvedSourceIdentifier> | null,
): ResolvedSourceIdentifier | null => {
  if (resolvedMusicInfo?.source && resolvedMusicInfo.id) {
    return {
      source: resolvedMusicInfo.source,
      id: resolvedMusicInfo.id,
    }
  }
  const baseMusicInfo = getBaseMusicInfo(musicInfo)
  if (!baseMusicInfo.source || !baseMusicInfo.id) return null
  return {
    source: baseMusicInfo.source,
    id: baseMusicInfo.id,
  }
}

const ensureFailedResolvedSourceRequestState = (
  musicInfo: MusicInfoLike,
  sourceId = appSetting['common.apiSource'],
) => {
  const requestId = createMusicUrlRequestId(musicInfo, sourceId)
  if (failedResolvedSourceState.requestId != requestId) {
    failedResolvedSourceState.requestId = requestId
    failedResolvedSourceState.resolvedMusicInfos = []
  }
  return requestId
}

export const clearFailedResolvedSourceMusicInfos = (
  musicInfo?: MusicInfoLike,
  sourceId = appSetting['common.apiSource'],
) => {
  if (!musicInfo) {
    resetFailedResolvedSourceState()
    return
  }
  if (failedResolvedSourceState.requestId == createMusicUrlRequestId(musicInfo, sourceId)) resetFailedResolvedSourceState()
}

export const getFailedResolvedSourceMusicInfos = (
  musicInfo: MusicInfoLike,
  sourceId = appSetting['common.apiSource'],
) => {
  return failedResolvedSourceState.requestId == createMusicUrlRequestId(musicInfo, sourceId)
    ? failedResolvedSourceState.resolvedMusicInfos
    : []
}

export const hasFailedResolvedSourceMusicInfo = (
  musicInfo: MusicInfoLike,
  resolvedMusicInfo?: Partial<ResolvedSourceIdentifier> | null,
  sourceId = appSetting['common.apiSource'],
) => {
  const normalizedResolvedMusicInfo = normalizeResolvedSourceIdentifier(musicInfo, resolvedMusicInfo)
  if (!normalizedResolvedMusicInfo) return false
  return getFailedResolvedSourceMusicInfos(musicInfo, sourceId)
    .some(item => isSameResolvedSourceIdentifier(item, normalizedResolvedMusicInfo))
}

export const markFailedResolvedSourceMusicInfo = (
  musicInfo: MusicInfoLike,
  resolvedMusicInfo?: Partial<ResolvedSourceIdentifier> | null,
  sourceId = appSetting['common.apiSource'],
) => {
  ensureFailedResolvedSourceRequestState(musicInfo, sourceId)
  const normalizedResolvedMusicInfo = normalizeResolvedSourceIdentifier(musicInfo, resolvedMusicInfo)
  if (!normalizedResolvedMusicInfo) return false
  if (failedResolvedSourceState.resolvedMusicInfos.some(item => isSameResolvedSourceIdentifier(item, normalizedResolvedMusicInfo))) return false
  failedResolvedSourceState.resolvedMusicInfos = [
    ...failedResolvedSourceState.resolvedMusicInfos,
    normalizedResolvedMusicInfo,
  ]
  return true
}
