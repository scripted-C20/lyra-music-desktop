import { appSetting } from '@renderer/store/setting'

const PRELOADED_MUSIC_URL_TTL = 90_000
const PRELOADED_MUSIC_URL_MAX = 8

type MusicInfoLike = LX.Music.MusicInfo | LX.Download.ListItem

const preloadedMusicUrlMap = new Map<string, {
  createdAt: number
  url: string
}>()

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

export const createMusicUrlRequestId = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  const targetMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  const toggleMusicInfo = targetMusicInfo.meta.toggleMusicInfo
  return `${musicInfo.id}_${toggleMusicInfo?.id ?? ''}_${sourceId}`
}

export const savePreloadedMusicUrl = (musicInfo: MusicInfoLike, url: string, sourceId = appSetting['common.apiSource']) => {
  if (!url) return
  cleanupExpiredPreloadedMusicUrls()
  const requestId = createMusicUrlRequestId(musicInfo, sourceId)
  preloadedMusicUrlMap.set(requestId, {
    url,
    createdAt: Date.now(),
  })
}

export const takePreloadedMusicUrl = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  cleanupExpiredPreloadedMusicUrls()
  const requestId = createMusicUrlRequestId(musicInfo, sourceId)
  const result = preloadedMusicUrlMap.get(requestId)?.url ?? ''
  if (result) preloadedMusicUrlMap.delete(requestId)
  return result
}

export const clearPreloadedMusicUrl = (musicInfo?: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  if (!musicInfo) {
    preloadedMusicUrlMap.clear()
    return
  }
  const requestId = createMusicUrlRequestId(musicInfo, sourceId)
  preloadedMusicUrlMap.delete(requestId)
}
