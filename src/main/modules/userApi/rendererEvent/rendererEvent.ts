import { mainOn } from '@common/mainIpc'
import { getSourceSearchTimeoutWithBufferMs } from '@common/constants'

import USER_API_RENDERER_EVENT_NAME from './name'
import { createUserApiWindowController, getProxy } from '../main'
import { getUserApis, setApiSources } from '../utils'
import { sendShowUpdateAlert, sendStatusChange } from '@main/modules/winMain'

const CANCELLED_RESULT = {
  __cancelled__: true,
}
const DEFAULT_REQUEST_TIMEOUT = 20_000
const MUSIC_URL_REQUEST_BUFFER = 10_000
const API_INIT_TIMEOUT = 20_000

interface InitParams {
  params: {
    status: boolean
    message: string
    data: LX.UserApi.UserApiInfo
  }
}
interface ResponseParams {
  params: {
    status: boolean
    message: string
    data: {
      requestKey: string
      result: any
    }
  }
}
interface UpdateInfoParams {
  params: {
    data: {
      log: string
      updateUrl: string
    }
  }
}

type RequestQueueValue = [
  resolve: (result: any) => void,
  reject: (error: Error) => void,
  data: any,
]

export interface UserApiRuntimeController {
  cancelRequest: (requestKey: string) => void
  closeWindow: () => Promise<void>
  destroy: () => Promise<void>
  getCurrentApiId: () => string | null
  getStatus: () => LX.UserApi.UserApiStatus
  id: string
  loadApi: (apiId: string) => Promise<void>
  request: (params: LX.UserApi.UserApiRequestParams) => Promise<any>
  restoreApi: (id: string | null) => Promise<void>
  setAllowShowUpdateAlert: (id: string, enable: boolean) => void
  switchApi: (id: string, options?: {
    silent?: boolean
    waitReady?: boolean
  }) => Promise<boolean>
  waitForApiReady: (apiId: string) => Promise<LX.UserApi.UserApiStatus>
  withRendererEventsSilenced: <T>(action: () => Promise<T>) => Promise<T>
}

interface UserApiRuntimeControllerOptions {
  id?: string
  suppressStatusChange?: boolean
  suppressUpdateAlert?: boolean
}

const getRequestTimeout = (data: any) => {
  switch (data?.action) {
    case 'musicUrl':
      return getSourceSearchTimeoutWithBufferMs(global.lx.appSetting['common.sourceSearchTimeout'], MUSIC_URL_REQUEST_BUFFER)
    default:
      return DEFAULT_REQUEST_TIMEOUT
  }
}

class RuntimeController implements UserApiRuntimeController {
  public readonly id: string

  private apiStatus: LX.UserApi.UserApiStatus = { status: true }
  private pendingInitTask: null | {
    apiId: string
    resolve: (status: LX.UserApi.UserApiStatus) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
    promise: Promise<LX.UserApi.UserApiStatus>
  } = null

  private readonly requestQueue = new Map<string, RequestQueueValue>()
  private readonly suppressStatusChange: boolean
  private readonly suppressUpdateAlert: boolean
  private readonly timeouts = new Map<string, NodeJS.Timeout>()
  private userApi: LX.UserApi.UserApiInfo | null = null
  private readonly windowController = createUserApiWindowController()
  private silentEventDepth = 0

  constructor(options: UserApiRuntimeControllerOptions = {}) {
    this.id = options.id ?? `user_api_runtime_${Math.random().toString().slice(2, 8)}`
    this.suppressStatusChange = !!options.suppressStatusChange
    this.suppressUpdateAlert = !!options.suppressUpdateAlert
  }

  public async closeWindow() {
    this.resetRequests('Cancel request')
    this.rejectInitTask('api init interrupted')
    this.userApi = null
    this.apiStatus = { status: true }
    this.silentEventDepth = 0
    await this.windowController.closeWindow()
  }

  public async destroy() {
    this.resetRequests('Cancel request')
    this.rejectInitTask('api init interrupted')
    await this.closeWindow()
    runtimeControllers.delete(this)
  }

  public getCurrentApiId() {
    return this.userApi?.id ?? null
  }

  public getStatus = () => this.apiStatus

  public async loadApi(apiId: string) {
    if (!apiId) {
      this.apiStatus = { status: false, message: 'api id is null' }
      this.emitStatusChange()
      return
    }
    const targetApi = getUserApis().find(api => api.id == apiId)
    if (!targetApi) throw new Error('api not found')
    this.userApi = targetApi
    this.apiStatus = { status: false, apiInfo: this.userApi }
    this.createInitTask(apiId)
    console.log('load api', this.userApi.name, this.id)
    await this.windowController.createWindow(targetApi)
  }

  public request = async({ requestKey, data }: LX.UserApi.UserApiRequestParams): Promise<any> => await new Promise((resolve, reject) => {
    if (!this.userApi) {
      reject(new Error('user api is not load'))
      return
    }
    if (this.timeouts.has(requestKey)) {
      this.cancelRequest(requestKey)
    }

    const timeout = getRequestTimeout(data)
    this.timeouts.set(requestKey, setTimeout(() => {
      this.timeoutRequest(requestKey)
    }, timeout))

    this.requestQueue.set(requestKey, [resolve, reject, data])
    this.windowController.sendEvent(USER_API_RENDERER_EVENT_NAME.request, { requestKey, data })
  })

  public restoreApi = async(id: string | null) => {
    if (!id) {
      await this.closeWindow()
      return
    }
    await this.switchApi(id, { silent: true, waitReady: true })
  }

  public setAllowShowUpdateAlert(id: string, enable: boolean) {
    if (!this.userApi || this.userApi.id != id) return
    this.userApi.allowShowUpdateAlert = enable
  }

  public async switchApi(id: string, options?: {
    silent?: boolean
    waitReady?: boolean
  }) {
    if (!getUserApis().some(api => api.id === id)) return false
    if (this.userApi) await this.closeWindow()
    const load = async() => {
      await this.loadApi(id)
      if (options?.waitReady) await this.waitForApiReady(id)
    }
    if (options?.silent) await this.withRendererEventsSilenced(load)
    else await load()
    return true
  }

  public waitForApiReady = async(apiId: string) => {
    if (this.apiStatus.status && this.apiStatus.apiInfo?.id === apiId && this.apiStatus.apiInfo?.sources) return this.apiStatus
    if (!this.pendingInitTask || this.pendingInitTask.apiId !== apiId) this.createInitTask(apiId)
    return this.pendingInitTask!.promise
  }

  public withRendererEventsSilenced = async<T>(action: () => Promise<T>) => {
    this.silentEventDepth++
    try {
      return await action()
    } finally {
      this.silentEventDepth--
    }
  }

  public cancelRequest = (requestKey: string) => {
    if (!this.requestQueue.has(requestKey)) return
    this.windowController.sendEvent(USER_API_RENDERER_EVENT_NAME.cancel, requestKey)
    const request = this.requestQueue.get(requestKey)
    request?.[0](CANCELLED_RESULT)
    this.requestQueue.delete(requestKey)
    this.clearRequestTimeout(requestKey)
  }

  public handleGetProxy = () => {
    this.windowController.sendEvent(USER_API_RENDERER_EVENT_NAME.proxyUpdate, getProxy())
  }

  public handleInit = ({ params: { status, message, data: apiInfo } }: InitParams) => {
    if (!this.userApi) return
    if (status) setApiSources(this.userApi.id, apiInfo.sources)
    this.apiStatus = status
      ? { status: true, apiInfo: { ...this.userApi, sources: apiInfo.sources } }
      : { status: false, apiInfo: this.userApi, message }
    if (status) this.resolveInitTask(this.apiStatus)
    else this.rejectInitTask(message)
    this.emitStatusChange()
  }

  public handleOpenDevTools = () => {
    if (this.isSilentEventMode()) return
    this.windowController.openDevTools()
  }

  public handleResponse = ({ params: { status, data: { requestKey, result }, message } }: ResponseParams) => {
    const request = this.requestQueue.get(requestKey)
    if (!request) return
    this.requestQueue.delete(requestKey)
    this.clearRequestTimeout(requestKey)
    if (status) request[0](result)
    else request[1](new Error(message))
  }

  public handleShowUpdateAlert = ({ params: { data } }: UpdateInfoParams) => {
    if (this.isSilentEventMode() || this.suppressUpdateAlert) return
    if (!this.userApi?.allowShowUpdateAlert) return
    sendShowUpdateAlert({
      name: this.userApi.name,
      description: this.userApi.description,
      log: data.log,
      updateUrl: data.updateUrl,
    })
  }

  public matchesSenderId(senderId: number) {
    return this.windowController.getWebContentsId() === senderId
  }

  private clearRequestTimeout(requestKey: string) {
    const timeout = this.timeouts.get(requestKey)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(requestKey)
    }
  }

  private createInitTask(apiId: string) {
    if (this.pendingInitTask) {
      clearTimeout(this.pendingInitTask.timeout)
      this.pendingInitTask.reject(new Error('api init interrupted'))
    }
    let resolve!: (status: LX.UserApi.UserApiStatus) => void
    let reject!: (error: Error) => void
    const promise = new Promise<LX.UserApi.UserApiStatus>((_resolve, _reject) => {
      resolve = _resolve
      reject = _reject
    })
    void promise.catch(() => {})
    const timeout = setTimeout(() => {
      if (!this.pendingInitTask || this.pendingInitTask.apiId !== apiId) return
      this.pendingInitTask = null
      reject(new Error('api init timeout'))
    }, API_INIT_TIMEOUT)
    this.pendingInitTask = {
      apiId,
      resolve,
      reject,
      timeout,
      promise,
    }
    return this.pendingInitTask
  }

  private emitStatusChange() {
    if (this.suppressStatusChange || this.isSilentEventMode()) return
    sendStatusChange(this.apiStatus)
  }

  private readonly isSilentEventMode = () => this.silentEventDepth > 0

  private rejectInitTask(message?: string) {
    if (!this.pendingInitTask) return
    clearTimeout(this.pendingInitTask.timeout)
    const task = this.pendingInitTask
    this.pendingInitTask = null
    task.reject(new Error(message ?? 'api init failed'))
  }

  private resolveInitTask(status: LX.UserApi.UserApiStatus) {
    if (!this.pendingInitTask) return
    clearTimeout(this.pendingInitTask.timeout)
    const task = this.pendingInitTask
    this.pendingInitTask = null
    task.resolve(status)
  }

  private resetRequests(message: string) {
    for (const timeout of this.timeouts.values()) clearTimeout(timeout)
    this.timeouts.clear()
    for (const [requestKey, request] of this.requestQueue.entries()) {
      request[1](new Error(message))
      this.requestQueue.delete(requestKey)
    }
  }

  private timeoutRequest(requestKey: string) {
    if (!this.requestQueue.has(requestKey)) return
    this.windowController.sendEvent(USER_API_RENDERER_EVENT_NAME.cancel, requestKey)
    const request = this.requestQueue.get(requestKey)
    request?.[1](new Error('Request timeout'))
    this.requestQueue.delete(requestKey)
    this.clearRequestTimeout(requestKey)
  }
}

const runtimeControllers = new Set<RuntimeController>()
let isInited = false

const findRuntimeControllerBySenderId = (senderId: number) => {
  for (const controller of runtimeControllers) {
    if (controller.matchesSenderId(senderId)) return controller
  }
  return null
}

export const createUserApiRuntimeController = (options: UserApiRuntimeControllerOptions = {}): UserApiRuntimeController => {
  const controller = new RuntimeController(options)
  runtimeControllers.add(controller)
  return controller
}

export const init = () => {
  if (isInited) return
  isInited = true
  mainOn(USER_API_RENDERER_EVENT_NAME.init, ({ event, params }: { event: Electron.IpcMainEvent, params: InitParams['params'] }) => {
    findRuntimeControllerBySenderId(event.sender.id)?.handleInit({ params })
  })
  mainOn(USER_API_RENDERER_EVENT_NAME.response, ({ event, params }: { event: Electron.IpcMainEvent, params: ResponseParams['params'] }) => {
    findRuntimeControllerBySenderId(event.sender.id)?.handleResponse({ params })
  })
  mainOn(USER_API_RENDERER_EVENT_NAME.openDevTools, ({ event }) => {
    findRuntimeControllerBySenderId(event.sender.id)?.handleOpenDevTools()
  })
  mainOn(USER_API_RENDERER_EVENT_NAME.showUpdateAlert, ({ event, params }: { event: Electron.IpcMainEvent, params: UpdateInfoParams['params'] }) => {
    findRuntimeControllerBySenderId(event.sender.id)?.handleShowUpdateAlert({ params })
  })
  mainOn(USER_API_RENDERER_EVENT_NAME.getProxy, ({ event }) => {
    findRuntimeControllerBySenderId(event.sender.id)?.handleGetProxy()
  })
}

export const defaultUserApiRuntimeController = createUserApiRuntimeController({
  id: 'default',
})

export const closeWindow = async() => {
  await defaultUserApiRuntimeController.closeWindow()
}

export const loadApi = async(apiId: string) => {
  await defaultUserApiRuntimeController.loadApi(apiId)
}

export const request = async(params: LX.UserApi.UserApiRequestParams) => {
  return defaultUserApiRuntimeController.request(params)
}

export const waitForApiReady = async(apiId: string) => {
  return defaultUserApiRuntimeController.waitForApiReady(apiId)
}

export const withRendererEventsSilenced = async<T>(action: () => Promise<T>) => {
  return defaultUserApiRuntimeController.withRendererEventsSilenced(action)
}

export const getStatus = () => defaultUserApiRuntimeController.getStatus()

export const setAllowShowUpdateAlert = (id: string, enable: boolean) => {
  defaultUserApiRuntimeController.setAllowShowUpdateAlert(id, enable)
}

export const cancelRequest = (requestKey: string) => {
  defaultUserApiRuntimeController.cancelRequest(requestKey)
}

export const switchApi = async(id: string, options?: {
  silent?: boolean
  waitReady?: boolean
}) => {
  return defaultUserApiRuntimeController.switchApi(id, options)
}

export const restoreApi = async(id: string | null) => {
  await defaultUserApiRuntimeController.restoreApi(id)
}
