import { appSetting } from '@renderer/store/setting'
import { getResolvedSourceMemory, saveResolvedSourceMemory } from '@renderer/utils/ipc'
import { getMusicIdentity } from './musicIdentity'

type MusicInfoLike = LX.Music.MusicInfo | LX.Download.ListItem

const runtimeSourceMemoryMap = new Map<string, LX.Music.MusicInfoOnline>()
const persistedSourceMemoryMap = new Map<string, LX.Music.MusicInfoOnline>()
const PERSISTED_SOURCE_MEMORY_MAX = 500
const PERSISTED_SOURCE_MEMORY_SAVE_DELAY = 300

let sourceMemoryLoaded = false
let loadingSourceMemoryPromise: Promise<void> | null = null
let saveSourceMemoryTimeout: NodeJS.Timeout | null = null

const getRuntimeSourceMemoryKey = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  return `${getMusicIdentity(musicInfo)}_${sourceId}`
}

const getBaseMusicInfo = (musicInfo: MusicInfoLike) => {
  return 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
}

const toOnlineMusicInfo = (musicInfo: MusicInfoLike): LX.Music.MusicInfoOnline | null => {
  const targetMusicInfo = getBaseMusicInfo(musicInfo)
  if (targetMusicInfo.source == 'local') return null
  return targetMusicInfo as LX.Music.MusicInfoOnline
}

const isSameOnlineMusicInfo = (
  sourceMusicInfo?: Pick<LX.Music.MusicInfoOnline, 'source' | 'id'> | null,
  targetMusicInfo?: Pick<LX.Music.MusicInfoOnline, 'source' | 'id'> | null,
) => {
  return !!sourceMusicInfo && !!targetMusicInfo &&
    sourceMusicInfo.source == targetMusicInfo.source &&
    sourceMusicInfo.id == targetMusicInfo.id
}

const cleanupPersistedSourceMemory = () => {
  while (persistedSourceMemoryMap.size > PERSISTED_SOURCE_MEMORY_MAX) {
    const firstKey = persistedSourceMemoryMap.keys().next().value
    if (!firstKey) break
    persistedSourceMemoryMap.delete(firstKey)
  }
}

const scheduleSavePersistedSourceMemory = () => {
  if (saveSourceMemoryTimeout) clearTimeout(saveSourceMemoryTimeout)
  saveSourceMemoryTimeout = setTimeout(() => {
    saveSourceMemoryTimeout = null
    saveResolvedSourceMemory(Array.from(persistedSourceMemoryMap.entries()))
  }, PERSISTED_SOURCE_MEMORY_SAVE_DELAY)
}

const normalizePersistedSourceMemoryEntry = (entry: unknown): [string, LX.Music.MusicInfoOnline] | null => {
  if (!Array.isArray(entry) || entry.length < 2) return null
  const [key, musicInfo] = entry
  if (typeof key != 'string' || !musicInfo || typeof musicInfo != 'object') return null
  const source = (musicInfo as { source?: LX.Source }).source
  const id = (musicInfo as { id?: string }).id
  if (!source || source == 'local' || !id) return null
  return [key, musicInfo as LX.Music.MusicInfoOnline]
}

const getLegacyToggleMusicInfo = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  if (/^user_api/.test(sourceId)) return null
  const baseMusicInfo = getBaseMusicInfo(musicInfo)
  const toggleMusicInfo = baseMusicInfo.meta.toggleMusicInfo ?? null
  if (!toggleMusicInfo) return null
  if (baseMusicInfo.source != 'local' && isSameOnlineMusicInfo(baseMusicInfo as LX.Music.MusicInfoOnline, toggleMusicInfo)) return null
  return toggleMusicInfo
}

export const initPersistedSourceMemory = async() => {
  if (sourceMemoryLoaded) return
  if (loadingSourceMemoryPromise) return loadingSourceMemoryPromise
  loadingSourceMemoryPromise = (async() => {
    const list = await getResolvedSourceMemory().catch(() => null)
    if (Array.isArray(list)) {
      for (const entry of list) {
        const normalizedEntry = normalizePersistedSourceMemoryEntry(entry)
        if (!normalizedEntry) continue
        const [key, musicInfo] = normalizedEntry
        if (persistedSourceMemoryMap.has(key)) continue
        persistedSourceMemoryMap.set(key, musicInfo)
      }
    }
    cleanupPersistedSourceMemory()
    sourceMemoryLoaded = true
  })().finally(() => {
    loadingSourceMemoryPromise = null
  })
  return loadingSourceMemoryPromise
}

export const getRuntimeSourceMemory = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  return runtimeSourceMemoryMap.get(getRuntimeSourceMemoryKey(musicInfo, sourceId)) ?? null
}

export const getPersistedSourceMemory = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  return persistedSourceMemoryMap.get(getRuntimeSourceMemoryKey(musicInfo, sourceId)) ?? null
}

export const getPreferredResolvedSourceMusicInfo = (musicInfo: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  return getRuntimeSourceMemory(musicInfo, sourceId) ??
    getPersistedSourceMemory(musicInfo, sourceId) ??
    getLegacyToggleMusicInfo(musicInfo, sourceId)
}

export const setRuntimeSourceMemory = (
  musicInfo: MusicInfoLike,
  resolvedMusicInfo: MusicInfoLike,
  sourceId = appSetting['common.apiSource'],
) => {
  const targetMusicInfo = toOnlineMusicInfo(resolvedMusicInfo)
  const key = getRuntimeSourceMemoryKey(musicInfo, sourceId)
  if (!targetMusicInfo) {
    runtimeSourceMemoryMap.delete(key)
    if (persistedSourceMemoryMap.delete(key)) scheduleSavePersistedSourceMemory()
    return
  }

  const baseMusicInfo = toOnlineMusicInfo(musicInfo)
  if (baseMusicInfo && baseMusicInfo.id == targetMusicInfo.id && baseMusicInfo.source == targetMusicInfo.source) {
    runtimeSourceMemoryMap.delete(key)
    if (persistedSourceMemoryMap.delete(key)) scheduleSavePersistedSourceMemory()
    return
  }

  runtimeSourceMemoryMap.delete(key)
  runtimeSourceMemoryMap.set(key, targetMusicInfo)
  persistedSourceMemoryMap.delete(key)
  persistedSourceMemoryMap.set(key, targetMusicInfo)
  cleanupPersistedSourceMemory()
  scheduleSavePersistedSourceMemory()
}

export const clearRuntimeSourceMemory = (musicInfo?: MusicInfoLike, sourceId = appSetting['common.apiSource']) => {
  if (!musicInfo) {
    runtimeSourceMemoryMap.clear()
    return
  }
  runtimeSourceMemoryMap.delete(getRuntimeSourceMemoryKey(musicInfo, sourceId))
}
