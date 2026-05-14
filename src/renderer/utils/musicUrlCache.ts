const normalizeCacheSourceId = (sourceId?: string | null) => sourceId ?? 'default'

export const createMusicUrlCacheId = (
  musicInfo: LX.Music.MusicInfo,
  quality: LX.Quality,
  sourceId?: string | null,
) => {
  return `${normalizeCacheSourceId(sourceId)}_${musicInfo.source}_${musicInfo.id}_${quality}`
}
