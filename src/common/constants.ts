export const URL_SCHEME_RXP = /^lxmusic:\/\//

export const SPLIT_CHAR = {
  DISLIKE_NAME: '@',
  DISLIKE_NAME_ALIAS: '#',
} as const

export const STORE_NAMES = {
  APP_SETTINGS: 'config_v2',
  DATA: 'data',
  SYNC: 'sync',
  HOTKEY: 'hot_key',
  USER_API: 'user_api',
  LRC_RAW: 'lyrics',
  LRC_EDITED: 'lyrics_edited',
  THEME: 'theme',
  SOUND_EFFECT: 'sound_effect',
} as const

export const APP_EVENT_NAMES = {
  winMainName: 'win_main',
  winLyricName: 'win_lyric',
  trayName: 'tray',
} as const

export const LIST_IDS = {
  DEFAULT: 'default',
  LOVE: 'love',
  TEMP: 'temp',
  DOWNLOAD: 'download',
  PLAY_LATER: null,
} as const

export const SOURCE_SEARCH_TIMEOUT = {
  DEFAULT: 15,
  MIN: 1,
  MAX: 60,
} as const

export const SOURCE_SEARCH_TIMEOUT_BUFFER_MS = 10_000

export const normalizeSourceSearchTimeout = (value: unknown) => {
  if (value == null || value === '') return SOURCE_SEARCH_TIMEOUT.DEFAULT
  const timeout = Math.trunc(Number(value))
  if (!Number.isFinite(timeout)) return SOURCE_SEARCH_TIMEOUT.DEFAULT
  return Math.min(SOURCE_SEARCH_TIMEOUT.MAX, Math.max(SOURCE_SEARCH_TIMEOUT.MIN, timeout))
}

export const getSourceSearchTimeoutMs = (value: unknown) => {
  return normalizeSourceSearchTimeout(value) * 1_000
}

export const getSourceSearchTimeoutWithBufferMs = (value: unknown, bufferMs: number = SOURCE_SEARCH_TIMEOUT_BUFFER_MS) => {
  return getSourceSearchTimeoutMs(value) + Math.max(0, Math.trunc(bufferMs))
}

export const DATA_KEYS = {
  viewPrevState: 'viewPrevState',
  playInfo: 'playInfo',
  searchHistoryList: 'searchHistoryList',
  listScrollPosition: 'listScrollPosition',
  listPrevSelectId: 'listPrevSelectId',
  listUpdateInfo: 'listUpdateInfo',
  ignoreVersion: 'ignoreVersion',

  leaderboardSetting: 'leaderboardSetting',
  songListSetting: 'songListSetting',
  searchSetting: 'searchSetting',

  lastStartInfo: 'lastStartInfo',
} as const

export const DEFAULT_SETTING = {
  leaderboard: {
    source: 'kw',
    boardId: 'kw__16',
  },

  songList: {
    source: 'kw',
    sortId: 'new',
    tagId: '',
  },

  search: {
    temp_source: 'kw',
    source: 'all',
    type: 'music',
  },

  viewPrevState: {
    url: '/search',
    query: {},
  },
}

export const DOWNLOAD_STATUS = {
  RUN: 'run',
  WAITING: 'waiting',
  PAUSE: 'pause',
  ERROR: 'error',
  COMPLETED: 'completed',
} as const

export const QUALITYS = ['flac24bit', 'flac', 'wav', 'ape', '320k', '192k', '128k'] as const

export const TRAY_AUTO_ID = -1
