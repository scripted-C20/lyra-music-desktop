import { mainSend } from '@common/mainIpc'
import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'node:path'
import { openDevTools as handleOpenDevTools } from '@main/utils'
import USER_API_RENDERER_EVENT_NAME from './rendererEvent/name'
import { getScript } from './utils'

let html: string | null = null
let dir: string | null = null
let userApiSessionSeed = 0

const denyEvents = [
  'will-navigate',
  'will-redirect',
  'will-attach-webview',
  'will-prevent-unload',
  'media-started-playing',
] as const

const prepareAssets = async() => {
  dir ??= process.env.NODE_ENV !== 'production' ? webpackUserApiPath : path.join(__dirname, 'userApi')
  if (!html) {
    const loadedHtml = await fs.promises.readFile(path.join(dir, 'renderer/user-api.html'), 'utf8')
    html ??= loadedHtml
  }
  return {
    dir,
    html,
    preloadUrl: process.env.NODE_ENV !== 'production'
      ? `${path.join(__dirname, '../dist/user-api-preload.js')}`
      : `${path.join(__dirname, 'user-api-preload.js')}`,
  }
}

export const getProxy = () => {
  if (global.lx.appSetting['network.proxy.enable'] && global.lx.appSetting['network.proxy.host']) {
    return {
      host: global.lx.appSetting['network.proxy.host'],
      port: global.lx.appSetting['network.proxy.port'],
    }
  }
  const envProxy = envParams.cmdParams['proxy-server']
  if (envProxy && typeof envProxy == 'string') {
    const [host, port = ''] = envProxy.split(':')
    return {
      host,
      port,
    }
  }
  return {
    host: '',
    port: '',
  }
}

export interface UserApiWindowController {
  closeWindow: () => Promise<void>
  createWindow: (userApi: LX.UserApi.UserApiInfo) => Promise<void>
  getWebContentsId: () => number | null
  openDevTools: () => void
  sendEvent: <T = any>(name: string, params?: T) => void
}

export const createUserApiWindowController = (): UserApiWindowController => {
  let browserWindow: Electron.BrowserWindow | null = null
  const sessionPartition = `lx-user-api-${++userApiSessionSeed}`

  const sendEvent = <T = any>(name: string, params?: T) => {
    if (!browserWindow) return
    mainSend(browserWindow, name, params)
  }

  const handleUpdateProxy = (keys: Array<keyof LX.AppSetting>) => {
    if (keys.includes('network.proxy.enable') || (global.lx.appSetting['network.proxy.enable'] && keys.some(k => k.startsWith('network.proxy.')))) {
      sendEvent(USER_API_RENDERER_EVENT_NAME.proxyUpdate, getProxy())
    }
  }

  const detachProxyListener = () => {
    global.lx.event_app.off('updated_config', handleUpdateProxy)
  }

  const attachProxyListener = () => {
    detachProxyListener()
    global.lx.event_app.on('updated_config', handleUpdateProxy)
  }

  const closeWindow = async() => {
    detachProxyListener()
    if (!browserWindow) return
    const win = browserWindow
    browserWindow = null
    try {
      await Promise.all([
        win.webContents.session.clearAuthCache(),
        win.webContents.session.clearStorageData(),
        win.webContents.session.clearCache(),
      ])
    } finally {
      if (!win.isDestroyed()) win.destroy()
    }
  }

  const createWindow = async(userApi: LX.UserApi.UserApiInfo) => {
    await closeWindow()
    const assets = await prepareAssets()

    const win = new BrowserWindow({
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      roundedCorners: false,
      hasShadow: false,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        sandbox: false,
        backgroundThrottling: false,
        spellcheck: false,
        autoplayPolicy: 'document-user-activation-required',
        enableWebSQL: false,
        disableDialogs: true,
        webgl: false,
        images: false,
        partition: sessionPartition,
        preload: assets.preloadUrl,
      },
    })
    browserWindow = win

    for (const eventName of denyEvents) {
      // @ts-expect-error
      win.webContents.on(eventName, (event: Electron.Event) => {
        event.preventDefault()
      })
    }
    win.webContents.session.setPermissionRequestHandler((webContents, permission, resolve) => {
      if (webContents === win.webContents) {
        resolve(false)
        return
      }
      resolve(true)
    })
    win.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' }
    })

    win.on('closed', () => {
      detachProxyListener()
      if (browserWindow === win) browserWindow = null
    })

    await win.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(assets.html))

    win.once('ready-to-show', async() => {
      if (browserWindow !== win) return
      attachProxyListener()
      sendEvent(USER_API_RENDERER_EVENT_NAME.initEnv, {
        ...userApi,
        script: await getScript(userApi.id),
        proxy: getProxy(),
      })
    })
  }

  return {
    closeWindow,
    createWindow,
    getWebContentsId() {
      return browserWindow?.webContents.id ?? null
    },
    openDevTools() {
      if (!browserWindow) return
      handleOpenDevTools(browserWindow.webContents)
    },
    sendEvent,
  }
}

const defaultWindowController = createUserApiWindowController()

export const createWindow = async(userApi: LX.UserApi.UserApiInfo) => {
  await defaultWindowController.createWindow(userApi)
}

export const closeWindow = async() => {
  await defaultWindowController.closeWindow()
}

export const sendEvent = <T = any>(name: string, params?: T) => {
  defaultWindowController.sendEvent(name, params)
}

export const openDevTools = () => {
  defaultWindowController.openDevTools()
}
