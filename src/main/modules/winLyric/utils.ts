// 设置窗口位置、大小
export let minWidth = 38
export let minHeight = 38

const normalizeLyricWindowSize = (width: number, height: number) => {
  if (width < minWidth) width = minWidth
  if (height < minHeight) height = minHeight
  return { width, height }
}

const clampLyricWindowPosition = (x: number, y: number, width: number, height: number): {
  x: number
  y: number
  width?: number
  height?: number
} => {
  if (!global.lx.appSetting['desktopLyric.isLockScreen']) return { x, y }
  if (!global.envParams.workAreaSize) return { x, y }

  const maxWinW = global.envParams.workAreaSize.width
  const maxWinH = global.envParams.workAreaSize.height

  if (width > maxWinW) width = maxWinW
  if (height > maxWinH) height = maxWinH

  const maxX = global.envParams.workAreaSize.width - width
  const maxY = global.envParams.workAreaSize.height - height

  if (x > maxX) x = maxX
  else if (x < 0) x = 0

  if (y > maxY) y = maxY
  else if (y < 0) y = 0

  return { x, y, width, height }
}


// const updateBounds = (bounds: Bounds) => {
//   bounds.x = bounds.x
//   return bounds
// }

/**
 *
 * @param bounds 当前设置
 * @param param 新设置（相对于当前设置）
 * @returns
 */
export const getLyricWindowBounds = (bounds: Electron.Rectangle, { x, y, w, h }: LX.DesktopLyric.NewBounds): Electron.Rectangle => {
  if (w <= 0) w = bounds.width
  if (h <= 0) h = bounds.height
  ;({ width: w, height: h } = normalizeLyricWindowSize(w, h))

  if (global.lx.appSetting['desktopLyric.isLockScreen']) {
    x += bounds.x
    y += bounds.y
  } else {
    y += bounds.y
    x += bounds.x
  }

  const position = clampLyricWindowPosition(x, y, w, h)
  x = position.x
  y = position.y
  w = position.width ?? w
  h = position.height ?? h

  // console.log('util bounds', bounds)
  return { width: w, height: h, x, y }
}

export const getAbsoluteLyricWindowBounds = (bounds: Electron.Rectangle, { x, y, w, h }: LX.DesktopLyric.NewBounds): Electron.Rectangle => {
  if (w <= 0) w = bounds.width
  if (h <= 0) h = bounds.height
  ;({ width: w, height: h } = normalizeLyricWindowSize(w, h))

  const position = clampLyricWindowPosition(x, y, w, h)
  return {
    x: position.x,
    y: position.y,
    width: position.width ?? w,
    height: position.height ?? h,
  }
}


export const watchConfigKeys = [
  'desktopLyric.enable',
  'desktopLyric.isLock',
  'desktopLyric.isAlwaysOnTop',
  'desktopLyric.isAlwaysOnTopLoop',
  'desktopLyric.isShowTaskbar',
  'desktopLyric.pauseHide',
  'desktopLyric.audioVisualization',
  'desktopLyric.width',
  'desktopLyric.height',
  'desktopLyric.x',
  'desktopLyric.y',
  'desktopLyric.isLockScreen',
  'desktopLyric.isDelayScroll',
  'desktopLyric.scrollAlign',
  'desktopLyric.isHoverHide',
  'desktopLyric.direction',
  'desktopLyric.style.align',
  'desktopLyric.style.lyricUnplayColor',
  'desktopLyric.style.lyricPlayedColor',
  'desktopLyric.style.lyricShadowColor',
  'desktopLyric.style.backgroundColor',
  'desktopLyric.style.backgroundOpacity',
  'desktopLyric.style.font',
  'desktopLyric.style.fontSize',
  'desktopLyric.style.lineGap',
  'desktopLyric.style.layout',
  // 'desktopLyric.style.fontWeight',
  'desktopLyric.style.opacity',
  'desktopLyric.style.ellipsis',
  'desktopLyric.style.isFontWeightFont',
  'desktopLyric.style.isFontWeightLine',
  'desktopLyric.style.isFontWeightExtended',
  'desktopLyric.style.isZoomActiveLrc',
  'common.langId',
  'player.isShowLyricTranslation',
  'player.isShowLyricRoma',
  'player.isSwapLyricTranslationAndRoma',
  'player.isPlayLxlrc',
  'player.playbackRate',
] satisfies Array<keyof LX.AppSetting>

export const buildLyricConfig = (appSetting: Partial<LX.AppSetting>): Partial<LX.DesktopLyric.Config> => {
  const setting: Partial<LX.DesktopLyric.Config> = {}
  for (const key of watchConfigKeys) {
    // @ts-expect-error
    if (key in appSetting) setting[key] = appSetting[key]
  }
  return setting
}

export const initWindowSize = (x: LX.AppSetting['desktopLyric.x'], y: LX.AppSetting['desktopLyric.y'], width: LX.AppSetting['desktopLyric.width'], height: LX.AppSetting['desktopLyric.height']) => {
  if (x == null || y == null) {
    if (width < minWidth) width = minWidth
    if (height < minHeight) height = minHeight
    if (global.envParams.workAreaSize) {
      x = global.envParams.workAreaSize.width - width
      y = global.envParams.workAreaSize.height - height
    } else {
      x = y = 0
    }
  } else {
    let bounds = getLyricWindowBounds({ x, y, width, height }, { x: 0, y: 0, w: width, h: height })
    x = bounds.x
    y = bounds.y
    width = bounds.width
    height = bounds.height
  }
  return {
    x,
    y,
    width,
    height,
  }
}
