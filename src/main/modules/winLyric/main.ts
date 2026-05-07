import path from 'node:path'
import { BrowserWindow, screen } from 'electron'
import { debounce, getPlatform, isLinux } from '@common/utils'
import { initWindowSize, minHeight, minWidth } from './utils'
import { mainSend } from '@common/mainIpc'
import { encodePath } from '@common/utils/electron'

// require('./event')
// require('./rendererEvent')

let browserWindow: Electron.BrowserWindow | null = null
let isWinBoundsUpdateing = false
type WindowInteractionOrigin = LX.DesktopLyric.WindowInteractionOrigin
interface RendererWindowInteractionState {
  origin: WindowInteractionOrigin | null
  width: number
  height: number
}

interface WindowInteractionState {
  origin: WindowInteractionOrigin | null
  startPointerX: number
  startPointerY: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  lastPointerX: number
  lastPointerY: number
  timer: NodeJS.Timeout | null
}

const windowInteractionState: WindowInteractionState = {
  origin: null,
  startPointerX: 0,
  startPointerY: 0,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  lastPointerX: Number.NaN,
  lastPointerY: Number.NaN,
  timer: null,
}
const rendererWindowInteractionState: RendererWindowInteractionState = {
  origin: null,
  width: 0,
  height: 0,
}

const getWindowContentBounds = () => {
  if (!browserWindow) return null
  return browserWindow.getContentBounds()
}

const clearWindowInteractionTimer = () => {
  if (!windowInteractionState.timer) return
  clearInterval(windowInteractionState.timer)
  windowInteractionState.timer = null
}

const clearRendererWindowInteractionState = () => {
  rendererWindowInteractionState.origin = null
  rendererWindowInteractionState.width = 0
  rendererWindowInteractionState.height = 0
}

const syncRendererWindowInteractionState = (origin: WindowInteractionOrigin | null) => {
  if (!origin) {
    clearRendererWindowInteractionState()
    return
  }
  const bounds = getWindowContentBounds()
  rendererWindowInteractionState.origin = origin
  rendererWindowInteractionState.width = bounds?.width ?? 0
  rendererWindowInteractionState.height = bounds?.height ?? 0
}

const getMoveInteractionLockedSize = () => {
  if (windowInteractionState.origin == 'move') {
    return {
      width: windowInteractionState.startWidth,
      height: windowInteractionState.startHeight,
    }
  }
  if (rendererWindowInteractionState.origin == 'move') {
    return {
      width: rendererWindowInteractionState.width,
      height: rendererWindowInteractionState.height,
    }
  }
  return null
}

const normalizeWindowValue = (value: number, fallback: number) => {
  const normalized = Number.isFinite(value) ? Math.round(value) : Math.round(fallback)
  return Object.is(normalized, -0) ? 0 : normalized
}

const normalizeWindowBounds = (bounds: Electron.Rectangle, fallback: Electron.Rectangle): Electron.Rectangle => {
  const width = Math.max(minWidth, normalizeWindowValue(bounds.width, fallback.width))
  const height = Math.max(minHeight, normalizeWindowValue(bounds.height, fallback.height))
  return {
    x: normalizeWindowValue(bounds.x, fallback.x),
    y: normalizeWindowValue(bounds.y, fallback.y),
    width,
    height,
  }
}

const applyWindowInteraction = (screenX: number, screenY: number) => {
  if (!browserWindow || !windowInteractionState.origin) return
  if (windowInteractionState.lastPointerX === screenX && windowInteractionState.lastPointerY === screenY) return

  windowInteractionState.lastPointerX = screenX
  windowInteractionState.lastPointerY = screenY

  const deltaPointerX = screenX - windowInteractionState.startPointerX
  const deltaPointerY = screenY - windowInteractionState.startPointerY

  let targetX = windowInteractionState.startX
  let targetY = windowInteractionState.startY
  let targetWidth = windowInteractionState.startWidth
  let targetHeight = windowInteractionState.startHeight

  switch (windowInteractionState.origin) {
    case 'move':
      targetX += deltaPointerX
      targetY += deltaPointerY
      break
    case 'left':
      targetX += deltaPointerX
      targetWidth -= deltaPointerX
      break
    case 'right':
      targetWidth += deltaPointerX
      break
    case 'top':
      targetY += deltaPointerY
      targetHeight -= deltaPointerY
      break
    case 'bottom':
      targetHeight += deltaPointerY
      break
    case 'top-left':
      targetX += deltaPointerX
      targetWidth -= deltaPointerX
      targetY += deltaPointerY
      targetHeight -= deltaPointerY
      break
    case 'top-right':
      targetWidth += deltaPointerX
      targetY += deltaPointerY
      targetHeight -= deltaPointerY
      break
    case 'bottom-left':
      targetX += deltaPointerX
      targetWidth -= deltaPointerX
      targetHeight += deltaPointerY
      break
    case 'bottom-right':
      targetWidth += deltaPointerX
      targetHeight += deltaPointerY
      break
  }

  if (targetWidth < minWidth) {
    if (windowInteractionState.origin.includes('left')) targetX = windowInteractionState.startX + windowInteractionState.startWidth - minWidth
    targetWidth = minWidth
  }
  if (targetHeight < minHeight) {
    if (windowInteractionState.origin.includes('top')) targetY = windowInteractionState.startY + windowInteractionState.startHeight - minHeight
    targetHeight = minHeight
  }

  if (windowInteractionState.origin == 'move') {
    try {
      browserWindow.setPosition(
        normalizeWindowValue(targetX, windowInteractionState.startX),
        normalizeWindowValue(targetY, windowInteractionState.startY),
        false,
      )
    } catch {
      stopWindowInteraction()
    }
    return
  }

  const normalizedBounds = normalizeWindowBounds({
    x: targetX,
    y: targetY,
    width: targetWidth,
    height: targetHeight,
  }, {
    x: windowInteractionState.startX,
    y: windowInteractionState.startY,
    width: windowInteractionState.startWidth,
    height: windowInteractionState.startHeight,
  })
  try {
    setBounds(normalizedBounds)
  } catch {
    stopWindowInteraction()
  }
}

export const stopWindowInteraction = () => {
  windowInteractionState.origin = null
  clearWindowInteractionTimer()
}

export const setRendererWindowInteractionState = (origin: WindowInteractionOrigin | null) => {
  syncRendererWindowInteractionState(origin)
}

export const startWindowInteraction = (origin: WindowInteractionOrigin, screenX: number, screenY: number) => {
  const bounds = getWindowContentBounds()
  if (!bounds) return

  stopWindowInteraction()
  windowInteractionState.origin = origin
  windowInteractionState.startPointerX = screenX
  windowInteractionState.startPointerY = screenY
  windowInteractionState.startX = bounds.x
  windowInteractionState.startY = bounds.y
  windowInteractionState.startWidth = bounds.width
  windowInteractionState.startHeight = bounds.height
  windowInteractionState.lastPointerX = Number.NaN
  windowInteractionState.lastPointerY = Number.NaN

  windowInteractionState.timer = setInterval(() => {
    if (!windowInteractionState.origin || !browserWindow || browserWindow.isDestroyed()) {
      stopWindowInteraction()
      return
    }
    const point = screen.getCursorScreenPoint()
    applyWindowInteraction(point.x, point.y)
  }, 16)
}

const saveBoundsConfig = debounce((config: Partial<LX.AppSetting>) => {
  global.lx.event_app.update_config(config)
  if (isWinBoundsUpdateing) isWinBoundsUpdateing = false
}, 500)

const winEvent = () => {
  if (!browserWindow) return

  // browserWindow.on('close', () => {
  //   if (global.lx.appSetting['desktopLyric.enable'] && !global.lx.mainWindowClosed) {
  //     browserWindow = null
  //     global.lx.event_app.update_config({ 'desktopLyric.enable': false })
  //   }
  // })

  browserWindow.on('closed', () => {
    clearRendererWindowInteractionState()
    browserWindow = null
  })

  browserWindow.on('move', () => {
    const bounds = getWindowContentBounds()
    if (!bounds) return
    // Keep the latest position instead of snapping back on Windows.
    // The snap-back path is prone to causing visible drift while dragging.
    saveBoundsConfig({
      'desktopLyric.x': bounds.x,
      'desktopLyric.y': bounds.y,
    })
  })

  browserWindow.on('resize', () => {
    isWinBoundsUpdateing = true
    const bounds = getWindowContentBounds()
    if (!bounds) return
    const moveLockedSize = getMoveInteractionLockedSize()
    if (moveLockedSize) {
      if (bounds.width != moveLockedSize.width || bounds.height != moveLockedSize.height) {
        try {
          browserWindow!.setContentSize(moveLockedSize.width, moveLockedSize.height)
        } catch {
          stopWindowInteraction()
        }
      }
      saveBoundsConfig({
        'desktopLyric.x': bounds.x,
        'desktopLyric.y': bounds.y,
      })
      return
    }
    saveBoundsConfig({
      'desktopLyric.x': bounds.x,
      'desktopLyric.y': bounds.y,
      'desktopLyric.width': bounds.width,
      'desktopLyric.height': bounds.height,
    })
  })

  // browserWindow.on('restore', () => {
  //   browserWindow.webContents.send('restore')
  // })
  // browserWindow.on('focus', () => {
  //   browserWindow.webContents.send('focus')
  // })

  browserWindow.once('ready-to-show', () => {
    showWindow()
    if (global.lx.appSetting['desktopLyric.isLock']) {
      browserWindow!.setIgnoreMouseEvents(true, { forward: !isLinux && global.lx.appSetting['desktopLyric.isHoverHide'] })
    }
    // linux下每次重开时貌似要重新设置置顶
    // if (isLinux && global.lx.appSetting['desktopLyric.isAlwaysOnTop']) {
    //   browserWindow!.setAlwaysOnTop(global.lx.appSetting['desktopLyric.isAlwaysOnTop'], 'screen-saver')
    // }
    if (global.lx.appSetting['desktopLyric.isAlwaysOnTop'] && global.lx.appSetting['desktopLyric.isAlwaysOnTopLoop']) alwaysOnTopTools.startLoop()
    browserWindow!.blur()
  })
}

export const createWindow = () => {
  closeWindow()
  if (!global.envParams.workAreaSize) return
  let x = global.lx.appSetting['desktopLyric.x']
  let y = global.lx.appSetting['desktopLyric.y']
  let width = global.lx.appSetting['desktopLyric.width']
  let height = global.lx.appSetting['desktopLyric.height']
  let isAlwaysOnTop = global.lx.appSetting['desktopLyric.isAlwaysOnTop']
  // let isLockScreen = global.lx.appSetting['desktopLyric.isLockScreen']
  let isShowTaskbar = global.lx.appSetting['desktopLyric.isShowTaskbar']
  // let { width: screenWidth, height: screenHeight } = global.envParams.workAreaSize
  const winSize = initWindowSize(x, y, width, height)
  global.lx.event_app.update_config({
    'desktopLyric.x': winSize.x,
    'desktopLyric.y': winSize.y,
    'desktopLyric.width': winSize.width,
    'desktopLyric.height': winSize.height,
  })

  const { shouldUseDarkColors, theme } = global.lx.theme

  /**
   * Initial window options
   */
  browserWindow = new BrowserWindow({
    height: winSize.height,
    width: winSize.width,
    x: winSize.x,
    y: winSize.y,
    minWidth,
    minHeight,
    useContentSize: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    // enableRemoteModule: false,
    // icon: join(global.__static, isWin ? 'icons/256x256.ico' : 'icons/512x512.png'),
    // Always use custom resize handles to avoid frameless native hit-test
    // conflicts on Windows while dragging the lyric window.
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    roundedCorners: true,
    show: false,
    alwaysOnTop: isAlwaysOnTop,
    skipTaskbar: !isShowTaskbar,
    webPreferences: {
      contextIsolation: false,
      webSecurity: false,
      sandbox: false,
      nodeIntegration: true,
      enableWebSQL: false,
      webgl: false,
      spellcheck: false, // 禁用拼写检查器
      backgroundThrottling: false,
    },
  })

  const winURL = process.env.NODE_ENV !== 'production' ? 'http://localhost:9081/lyric.html' : `file://${path.join(encodePath(__dirname), 'lyric.html')}`
  void browserWindow.loadURL(winURL + `?os=${getPlatform()}&dark=${shouldUseDarkColors}&theme=${encodeURIComponent(JSON.stringify(theme))}`)

  winEvent()
  // browserWindow.webContents.openDevTools()
  global.lx.event_app.desktop_lyric_window_created(browserWindow)
}
export const isExistWindow = (): boolean => !!browserWindow

export const closeWindow = () => {
  if (!browserWindow) return
  stopWindowInteraction()
  clearRendererWindowInteractionState()
  browserWindow.close()
}

export const showWindow = () => {
  if (!browserWindow) return
  browserWindow.show()
}

export const setResizeable = (isResizeable: boolean) => {
  if (!browserWindow) return
  browserWindow.setResizable(isResizeable)
}

export const sendEvent = <T = any>(name: string, params?: T) => {
  if (!browserWindow) return
  mainSend(browserWindow, name, params)
}

export const getBounds = (): Electron.Rectangle | null => {
  return getWindowContentBounds()
}

export const setBounds = (bounds: Electron.Rectangle) => {
  if (!browserWindow) return
  isWinBoundsUpdateing = true
  const normalizedBounds = normalizeWindowBounds(bounds, getWindowContentBounds() ?? bounds)
  browserWindow.setContentBounds(normalizedBounds)
}

export const setWindowPosition = (x: number, y: number) => {
  if (!browserWindow) return
  isWinBoundsUpdateing = true
  const fallbackBounds = getWindowContentBounds() ?? { x, y, width: minWidth, height: minHeight }
  browserWindow.setPosition(
    normalizeWindowValue(x, fallbackBounds.x),
    normalizeWindowValue(y, fallbackBounds.y),
    false,
  )
}


export const setIgnoreMouseEvents = (ignore: boolean, options?: Electron.IgnoreMouseEventsOptions) => {
  if (!browserWindow) return
  browserWindow.setIgnoreMouseEvents(ignore, options)
}

export const setSkipTaskbar = (skip: boolean) => {
  if (!browserWindow) return
  browserWindow.setSkipTaskbar(skip)
}

export const setAlwaysOnTop = (flag: boolean, level?: 'normal' | 'floating' | 'torn-off-menu' | 'modal-panel' | 'main-menu' | 'status' | 'pop-up-menu' | 'screen-saver' | undefined, relativeLevel?: number | undefined) => {
  if (!browserWindow) return
  browserWindow.setAlwaysOnTop(flag, level, relativeLevel)
}

export const getMainFrame = (): Electron.WebFrameMain | null => {
  if (!browserWindow) return null
  return browserWindow.webContents.mainFrame
}

interface AlwaysOnTopTools {
  timeout: NodeJS.Timeout | null
  setAlwaysOnTop: (isLoop: boolean) => void
  startLoop: () => void
  clearLoop: () => void
}
export const alwaysOnTopTools: AlwaysOnTopTools = {
  timeout: null,
  setAlwaysOnTop(isLoop) {
    this.clearLoop()
    setAlwaysOnTop(global.lx.appSetting['desktopLyric.isAlwaysOnTop'], 'screen-saver')
    // console.log(isLoop)
    if (isLoop) this.startLoop()
  },
  startLoop() {
    this.clearLoop()
    this.timeout = setInterval(() => {
      if (!isExistWindow()) {
        this.clearLoop()
        return
      }
      setAlwaysOnTop(true, 'screen-saver')
    }, 500)
  },
  clearLoop() {
    if (!this.timeout) return
    clearInterval(this.timeout)
    this.timeout = null
  },
}
