import { BrowserWindow, dialog, screen, session } from 'electron'
import path from 'node:path'
import { createTaskBarButtons, getWindowSizeInfo, mainWindowMinHeight, mainWindowMinWidth } from './utils'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { getPlatform, isLinux, isWin } from '@common/utils'
import { getProxy, openDevTools as handleOpenDevTools } from '@main/utils'
import { mainSend } from '@common/mainIpc'
import { sendFocus, sendTaskbarButtonClick } from './rendererEvent'
import { encodePath } from '@common/utils/electron'

let browserWindow: Electron.BrowserWindow | null = null
const isMainWindowResizable = true
const windowMoveDragThreshold = 4
let mainWindowNormalBounds: Electron.Rectangle | null = null
let windowStateSyncTimer: NodeJS.Timeout | null = null

interface WindowMoveState {
  startPointerX: number
  startPointerY: number
  startX: number
  startY: number
  lastPointerX: number
  lastPointerY: number
  timer: NodeJS.Timeout | null
  hasMoved: boolean
}

const windowMoveState: WindowMoveState = {
  startPointerX: 0,
  startPointerY: 0,
  startX: 0,
  startY: 0,
  lastPointerX: Number.NaN,
  lastPointerY: Number.NaN,
  timer: null,
  hasMoved: false,
}

export interface MainWindowState {
  isFullscreen: boolean
  isMaximized: boolean
}

const isBoundsCoveringRect = (bounds: Electron.Rectangle, rect: Electron.Rectangle, tolerance = 2): boolean => {
  return bounds.x <= rect.x + tolerance &&
    bounds.y <= rect.y + tolerance &&
    bounds.x + bounds.width >= rect.x + rect.width - tolerance &&
    bounds.y + bounds.height >= rect.y + rect.height - tolerance
}

const isWindowBoundsFullscreenLike = (): boolean => {
  if (!browserWindow || browserWindow.isFullScreen() || browserWindow.isMinimized()) return false
  const bounds = browserWindow.getBounds()
  const display = screen.getDisplayMatching(bounds)
  return isBoundsCoveringRect(bounds, display.workArea) || isBoundsCoveringRect(bounds, display.bounds)
}

const getWindowState = (override: Partial<MainWindowState> = {}): MainWindowState => {
  const isFullscreen = override.isFullscreen ?? browserWindow?.isFullScreen() ?? false
  const isNativeMaximized = browserWindow?.isMaximized() ?? false
  return {
    isFullscreen,
    isMaximized: override.isMaximized ?? (!isFullscreen && (isNativeMaximized || isWindowBoundsFullscreenLike())),
  }
}

const sendWindowState = (override: Partial<MainWindowState> = {}): MainWindowState | null => {
  if (!browserWindow) return null
  const state = getWindowState(override)
  mainSend(browserWindow, WIN_MAIN_RENDERER_EVENT_NAME.window_state, state)
  return state
}

const normalizeWindowValue = (value: number, fallback: number): number => {
  const normalized = Number.isFinite(value) ? Math.round(value) : Math.round(fallback)
  return Object.is(normalized, -0) ? 0 : normalized
}

const normalizeWindowBounds = (options: Partial<Electron.Rectangle>): Partial<Electron.Rectangle> => {
  const nextOptions = { ...options }
  if (nextOptions.width != null && nextOptions.width < mainWindowMinWidth) nextOptions.width = mainWindowMinWidth
  if (nextOptions.height != null && nextOptions.height < mainWindowMinHeight) nextOptions.height = mainWindowMinHeight
  return nextOptions
}

const rememberNormalBounds = () => {
  if (!browserWindow || browserWindow.isFullScreen() || browserWindow.isMaximized() || browserWindow.isMinimized() || isWindowBoundsFullscreenLike()) return
  mainWindowNormalBounds = browserWindow.getBounds()
}

const clearWindowMoveTimer = () => {
  if (!windowMoveState.timer) return
  clearInterval(windowMoveState.timer)
  windowMoveState.timer = null
}

export const stopWindowMove = () => {
  clearWindowMoveTimer()
  rememberNormalBounds()
}

const applyWindowMove = (screenX: number, screenY: number) => {
  if (!browserWindow || browserWindow.isDestroyed()) {
    stopWindowMove()
    return
  }
  if (browserWindow.isFullScreen() || browserWindow.isMaximized()) {
    stopWindowMove()
    return
  }
  if (windowMoveState.lastPointerX === screenX && windowMoveState.lastPointerY === screenY) return

  windowMoveState.lastPointerX = screenX
  windowMoveState.lastPointerY = screenY

  const targetX = windowMoveState.startX + screenX - windowMoveState.startPointerX
  const targetY = windowMoveState.startY + screenY - windowMoveState.startPointerY
  if (!windowMoveState.hasMoved && Math.hypot(screenX - windowMoveState.startPointerX, screenY - windowMoveState.startPointerY) < windowMoveDragThreshold) return

  windowMoveState.hasMoved = true
  browserWindow.setPosition(
    normalizeWindowValue(targetX, windowMoveState.startX),
    normalizeWindowValue(targetY, windowMoveState.startY),
    false,
  )
}

export const startWindowMove = (screenX: number, screenY: number) => {
  if (!browserWindow || browserWindow.isDestroyed() || browserWindow.isFullScreen() || browserWindow.isMaximized()) return

  stopWindowMove()
  const bounds = browserWindow.getBounds()
  windowMoveState.startPointerX = normalizeWindowValue(screenX, 0)
  windowMoveState.startPointerY = normalizeWindowValue(screenY, 0)
  windowMoveState.startX = bounds.x
  windowMoveState.startY = bounds.y
  windowMoveState.lastPointerX = Number.NaN
  windowMoveState.lastPointerY = Number.NaN
  windowMoveState.hasMoved = false

  windowMoveState.timer = setInterval(() => {
    if (!browserWindow || browserWindow.isDestroyed()) {
      stopWindowMove()
      return
    }
    const point = screen.getCursorScreenPoint()
    applyWindowMove(point.x, point.y)
  }, 16)
}

const getFallbackNormalBounds = (): Electron.Rectangle => {
  const windowSizeInfo = getWindowSizeInfo(global.lx.appSetting['common.windowSizeId'])
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const { x, y, width, height } = display.workArea
  return {
    width: windowSizeInfo.width,
    height: windowSizeInfo.height,
    x: Math.round(x + (width - windowSizeInfo.width) / 2),
    y: Math.round(y + (height - windowSizeInfo.height) / 2),
  }
}

const restoreNormalBoundsIfNeeded = () => {
  if (!browserWindow || browserWindow.isFullScreen() || browserWindow.isMaximized() || !isWindowBoundsFullscreenLike()) return

  browserWindow.setBounds(mainWindowNormalBounds ?? getFallbackNormalBounds(), false)
}

const syncWindowStateByBounds = () => {
  if (!browserWindow) return
  if (windowStateSyncTimer) clearTimeout(windowStateSyncTimer)
  windowStateSyncTimer = setTimeout(() => {
    windowStateSyncTimer = null
    rememberNormalBounds()
    sendWindowState()
  }, 80)
}

const winEvent = () => {
  if (!browserWindow) return

  browserWindow.on('close', event => {
    if (global.lx.isSkipTrayQuit || !global.lx.appSetting['tray.enable']) {
      browserWindow!.setProgressBar(-1)
      // global.lx.mainWindowClosed = true
      global.lx.event_app.main_window_close()
      return
    }

    event.preventDefault()
    browserWindow!.hide()
  })

  browserWindow.on('closed', () => {
    // global.lx.mainWindowClosed = true
    if (windowStateSyncTimer) clearTimeout(windowStateSyncTimer)
    windowStateSyncTimer = null
    clearWindowMoveTimer()
    browserWindow = null
  })

  // browserWindow.on('restore', () => {
  //   browserWindow.webContents.send('restore')
  // })
  browserWindow.on('focus', () => {
    sendFocus()
    global.lx.event_app.main_window_focus()
  })

  browserWindow.on('blur', () => {
    global.lx.event_app.main_window_blur()
  })

  browserWindow.once('ready-to-show', () => {
    if (!global.envParams.cmdParams.hidden) {
      showWindow()
      setThumbarButtons()
    }
    rememberNormalBounds()
    sendWindowState()
    global.lx.event_app.main_window_ready_to_show()
  })

  browserWindow.on('show', () => {
    global.lx.event_app.main_window_show()

    // 修复隐藏窗口后再显示时任务栏按钮丢失的问题
    setThumbarButtons()
    sendWindowState()
  })
  browserWindow.on('hide', () => {
    global.lx.event_app.main_window_hide()
  })
  browserWindow.on('restore', sendWindowState)
  browserWindow.on('maximize', () => {
    stopWindowMove()
    sendWindowState()
  })
  browserWindow.on('unmaximize', sendWindowState)
  browserWindow.on('move', syncWindowStateByBounds)
  browserWindow.on('resize', syncWindowStateByBounds)
  browserWindow.on('enter-full-screen', () => {
    sendWindowState()
    global.lx.event_app.main_window_fullscreen(true)
  })
  browserWindow.on('leave-full-screen', () => {
    sendWindowState()
    global.lx.event_app.main_window_fullscreen(false)
  })
}


export const createWindow = () => {
  closeWindow()
  const windowSizeInfo = getWindowSizeInfo(global.lx.appSetting['common.windowSizeId'])

  const { shouldUseDarkColors, theme } = global.lx.theme
  const ses = session.fromPartition('persist:win-main')
  const proxy = getProxy()
  setSesProxy(ses, proxy?.host, proxy?.port)

  /**
   * Initial window options
   */
  const options: Electron.BrowserWindowConstructorOptions = {
    height: windowSizeInfo.height,
    useContentSize: true,
    width: windowSizeInfo.width,
    minWidth: mainWindowMinWidth,
    minHeight: mainWindowMinHeight,
    frame: false,
    transparent: !global.envParams.cmdParams.dt,
    hasShadow: global.envParams.cmdParams.dt,
    thickFrame: isWin,
    // enableRemoteModule: false,
    // icon: join(global.__static, isWin ? 'icons/256x256.ico' : 'icons/512x512.png'),
    resizable: isMainWindowResizable,
    maximizable: isMainWindowResizable,
    fullscreenable: true,
    roundedCorners: global.envParams.cmdParams.dt,
    show: false,
    webPreferences: {
      session: ses,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      webSecurity: false,
      nodeIntegration: true,
      sandbox: false,
      backgroundThrottling: false,
      enableWebSQL: false,
      webgl: false,
      spellcheck: false, // 禁用拼写检查器
    },
  }
  if (global.envParams.cmdParams.dt) options.backgroundColor = theme.colors['--color-primary-light-1000']
  if (global.lx.appSetting['common.startInFullscreen']) options.fullscreen = true
  browserWindow = new BrowserWindow(options)

  const winURL = process.env.NODE_ENV !== 'production' ? 'http://localhost:9080' : `file://${path.join(encodePath(__dirname), 'index.html')}`
  void browserWindow.loadURL(winURL + `?os=${getPlatform()}&dt=${global.envParams.cmdParams.dt}&dark=${shouldUseDarkColors}&theme=${encodeURIComponent(JSON.stringify(theme))}`)

  winEvent()

  if (global.envParams.cmdParams.odt) handleOpenDevTools(browserWindow.webContents)

  // global.lx.mainWindowClosed = false
  // browserWindow.webContents.openDevTools()
  global.lx.event_app.main_window_created(browserWindow)
}

export const isExistWindow = (): boolean => !!browserWindow
export const isShowWindow = (): boolean => {
  if (!browserWindow) return false
  return browserWindow.isVisible() && (isWin ? true : browserWindow.isFocused())
}

export const closeWindow = () => {
  if (!browserWindow) return
  browserWindow.close()
}

const setSesProxy = (ses: Electron.Session, host?: string, port?: string | number) => {
  if (host) {
    void ses.setProxy({
      mode: 'fixed_servers',
      proxyRules: `http://${host}:${port}`,
    })
  } else {
    void ses.setProxy({
      mode: 'direct',
    })
  }
}
export const setProxy = () => {
  if (!browserWindow) return
  const proxy = getProxy()
  setSesProxy(browserWindow.webContents.session, proxy?.host, proxy?.port)
}


export const sendEvent = <T = any>(name: string, params?: T) => {
  if (!browserWindow) return
  mainSend(browserWindow, name, params)
}

export const showSelectDialog = async(options: Electron.OpenDialogOptions) => {
  if (!browserWindow) throw new Error('main window is undefined')
  return dialog.showOpenDialog(browserWindow, options)
}
export const showDialog = ({ type, message, detail }: Electron.MessageBoxSyncOptions) => {
  if (!browserWindow) return
  dialog.showMessageBoxSync(browserWindow, {
    type,
    message,
    detail,
  })
}
export const showSaveDialog = async(options: Electron.SaveDialogOptions) => {
  if (!browserWindow) throw new Error('main window is undefined')
  return dialog.showSaveDialog(browserWindow, options)
}
export const minimize = () => {
  if (!browserWindow) return
  browserWindow.minimize()
}
export const maximize = async(): Promise<boolean> => {
  if (!browserWindow) return false
  if (browserWindow.isFullScreen()) {
    const state = await restoreWindow()
    return state.isMaximized
  }

  const currentState = getWindowState()
  const targetMaximized = !currentState.isMaximized
  if (targetMaximized) rememberNormalBounds()

  if (!targetMaximized && !browserWindow.isMaximized()) {
    restoreNormalBoundsIfNeeded()
    return sendWindowState({ isFullscreen: false, isMaximized: false })?.isMaximized ?? false
  }

  const resultPromise = new Promise<boolean>((resolve) => {
    if (!browserWindow) {
      resolve(false)
      return
    }

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      sendWindowState()
      resolve(browserWindow?.isMaximized() ?? false)
    }
    const timeout = setTimeout(finish, 520)
    if (targetMaximized) browserWindow.once('maximize', finish)
    else browserWindow.once('unmaximize', finish)
  })

  if (targetMaximized) browserWindow.maximize()
  else browserWindow.unmaximize()
  sendWindowState({ isMaximized: targetMaximized })

  return resultPromise
}
export const unmaximize = () => {
  if (!browserWindow) return
  browserWindow.unmaximize()
}
export const restoreWindow = async(): Promise<MainWindowState> => {
  if (!browserWindow) return { isFullscreen: false, isMaximized: false }

  if (browserWindow.isMinimized()) browserWindow.restore()

  if (browserWindow.isFullScreen()) {
    await setFullScreen(false)
  } else {
    browserWindow.setFullScreen(false)
    const simpleFullscreenWindow = browserWindow as Electron.BrowserWindow & {
      isSimpleFullScreen?: () => boolean
      setSimpleFullScreen?: (flag: boolean) => void
    }
    if (simpleFullscreenWindow.isSimpleFullScreen?.()) {
      simpleFullscreenWindow.setSimpleFullScreen?.(false)
    }
  }

  if (browserWindow?.isMaximized()) {
    await new Promise<void>((resolve) => {
      if (!browserWindow) {
        resolve()
        return
      }
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        resolve()
      }
      const timeout = setTimeout(finish, 520)
      browserWindow.once('unmaximize', finish)
      browserWindow.unmaximize()
    })
  }

  restoreNormalBoundsIfNeeded()
  return sendWindowState({ isFullscreen: false, isMaximized: false }) ?? { isFullscreen: false, isMaximized: false }
}
export const toggleHide = () => {
  if (!browserWindow) return
  browserWindow.isVisible()
    ? browserWindow.hide()
    : browserWindow.show()
}
export const toggleMinimize = () => {
  if (!browserWindow) return
  if (browserWindow.isVisible()) {
    if (browserWindow.isMinimized()) browserWindow.restore()
    else browserWindow.minimize()
  } else browserWindow.show()
}
export const showWindow = () => {
  if (!browserWindow) return
  if (browserWindow.isVisible()) {
    if (browserWindow.isMinimized()) browserWindow.restore()
    else browserWindow.focus()
  } else browserWindow.show()
}
export const hideWindow = () => {
  if (!browserWindow) return
  browserWindow.hide()
}
export const setWindowBounds = (options: Partial<Electron.Rectangle>) => {
  if (!browserWindow) return
  const hasWidth = options.width != null
  const hasHeight = options.height != null
  const hasX = options.x != null
  const hasY = options.y != null

  if (!hasWidth && !hasHeight && (hasX || hasY)) {
    if (browserWindow.isFullScreen() || browserWindow.isMaximized()) return

    const [currentX, currentY] = browserWindow.getPosition()
    browserWindow.setPosition(
      normalizeWindowValue(options.x ?? currentX, currentX),
      normalizeWindowValue(options.y ?? currentY, currentY),
      false,
    )
    rememberNormalBounds()
    return
  }

  browserWindow.setBounds(normalizeWindowBounds(options))
  rememberNormalBounds()
}

export const setWindowResizable = (isResizable: boolean) => {
  if (!browserWindow) return
  browserWindow.setResizable(isResizable && isMainWindowResizable)
}

export const setProgressBar = (progress: number, options?: Electron.ProgressBarOptions) => {
  if (!browserWindow) return
  browserWindow.setProgressBar(progress, options)
}
export const setIgnoreMouseEvents = (ignore: boolean, options?: Electron.IgnoreMouseEventsOptions) => {
  if (!browserWindow) return
  browserWindow.setIgnoreMouseEvents(ignore, options)
}
export const toggleDevTools = () => {
  if (!browserWindow) return
  if (browserWindow.webContents.isDevToolsOpened()) {
    browserWindow.webContents.closeDevTools()
  } else {
    handleOpenDevTools(browserWindow.webContents)
  }
}

export const setFullScreen = async(isFullscreen: boolean): Promise<boolean> => {
  if (!browserWindow) return false
  if (browserWindow.isFullScreen() == isFullscreen) {
    sendWindowState()
    return browserWindow.isFullScreen()
  }
  if (isFullscreen) rememberNormalBounds()
  if (isLinux) browserWindow.setResizable(isMainWindowResizable)

  const resultPromise = new Promise<boolean>((resolve) => {
    if (!browserWindow) {
      resolve(false)
      return
    }

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      sendWindowState()
      resolve(browserWindow?.isFullScreen() ?? false)
    }
    const timeout = setTimeout(finish, 1500)
    if (isFullscreen) browserWindow.once('enter-full-screen', finish)
    else browserWindow.once('leave-full-screen', finish)
  })

  browserWindow.setFullScreen(isFullscreen)
  sendWindowState({ isFullscreen, isMaximized: false })
  return resultPromise
}

const taskBarButtonFlags: LX.TaskBarButtonFlags = {
  empty: true,
  collect: false,
  play: false,
  next: true,
  prev: true,
}
export const setThumbarButtons = ({ empty, collect, play, next, prev }: LX.TaskBarButtonFlags = taskBarButtonFlags) => {
  if (!isWin || !browserWindow) return
  taskBarButtonFlags.empty = empty
  taskBarButtonFlags.collect = collect
  taskBarButtonFlags.play = play
  taskBarButtonFlags.next = next
  taskBarButtonFlags.prev = prev
  browserWindow.setThumbarButtons(createTaskBarButtons(taskBarButtonFlags, action => {
    sendTaskbarButtonClick(action)
  }))
}

export const setThumbnailClip = (region: Electron.Rectangle) => {
  if (!browserWindow) return
  browserWindow.setThumbnailClip(region)
}


export const clearCache = async() => {
  if (!browserWindow) throw new Error('main window is undefined')
  await browserWindow.webContents.session.clearCache()
}

export const getCacheSize = async() => {
  if (!browserWindow) throw new Error('main window is undefined')
  return browserWindow.webContents.session.getCacheSize()
}

export const getWebContents = (): Electron.WebContents => {
  if (!browserWindow) throw new Error('main window is undefined')
  return browserWindow.webContents
}
