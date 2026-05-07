import {
  AArrowDown,
  AArrowUp,
  AudioLines,
  BadgeInfo,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CirclePlay,
  Download,
  Eraser,
  Expand,
  FileMusic,
  FolderPlus,
  Headphones,
  Info,
  Lock,
  LockOpen,
  Minus,
  Music2,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Share2,
  Shrink,
  Smartphone,
  ThumbsUp,
  Trash2,
  Vibrate,
  VibrateOff,
  X,
} from 'lucide-vue-next'

export const lucideIconMap = {
  addTo: FolderPlus,
  close: X,
  delete: Trash2,
  down: ChevronDown,
  download: Download,
  eraser: Eraser,
  first: ChevronsLeft,
  'font-decrease': AArrowDown,
  'font-increase': AArrowUp,
  'fullscreen-enter': Expand,
  'fullscreen-exit': Shrink,
  headphones: Headphones,
  'help-circle-outline': BadgeInfo,
  'information-slab-circle-outline': Info,
  last: ChevronsRight,
  'list-add': FolderPlus,
  lock: Lock,
  music: Music2,
  musicFile: FileMusic,
  'opactiy-decrease': Minus,
  'opactiy-increase': Plus,
  phone: Smartphone,
  'play-outline': CirclePlay,
  plus: Plus,
  refresh: RefreshCw,
  share: Share2,
  testPlay: AudioLines,
  'thumbs-up': ThumbsUp,
  'top-off': PinOff,
  'top-on': Pin,
  unlock: LockOpen,
  vibrate: Vibrate,
  'vibrate-off': VibrateOff,
}

export const legacyIconViewBoxMap = {
  album: '0 0 425.2 425.2',
  'angle-right-solid': '0 0 320 512',
  'download-2': '0 0 425.2 425.2',
  leaderboard: '0 0 425.2 425.2',
  left: '0 0 451.847 451.847',
  love: '0 0 443.42 396.7',
  nextMusic: '0 0 1024 1024',
  pause: '0 0 1024 1024',
  play: '0 0 1024 1024',
  prevMusic: '0 0 1024 1024',
  right: '0 0 451.846 451.847',
  search: '0 0 30.239 30.239',
  'search-2': '0 0 425.2 425.2',
  setting: '0 0 492.33 440.48',
  'window-close': '0 0 24 24',
  'window-close-2': '0 0 24 24',
  'window-hide': '0 0 30.73 30.73',
  'window-maximize': '0 0 24 24',
  'window-restore': '0 0 24 24',
  'window-minimize': '0 0 24 24',
  'window-minimize-2': '0 0 24 24',
}

export const normalizeLucideIconName = (value) => {
  if (!value || typeof value != 'string') return ''
  return value
    .trim()
    .replace(/^#icon-/, '')
}

export const resolveLucideIcon = (value) => {
  return lucideIconMap[normalizeLucideIconName(value)] ?? null
}

export const resolveLegacyIconViewBox = (value) => {
  return legacyIconViewBoxMap[normalizeLucideIconName(value)] ?? null
}
