import { closeWindow } from './main'
import { exportApi as handleExportApi, getUserApis, importApi as handleImportApi, removeApi as handleRemoveApi, setAllowShowUpdateAlert as saveAllowShowUpdateAlert } from './utils'
import {
  createUserApiRuntimeController,
  defaultUserApiRuntimeController,
  init,
  setAllowShowUpdateAlert as setRendererEventAllowShowUpdateAlert,
  type UserApiRuntimeController,
} from './rendererEvent/rendererEvent'

const TEST_SOURCE_ORDER: LX.Source[] = ['kw', 'kg', 'tx', 'wy', 'mg', 'local']
const PLAYBACK_HIGH_QUALITY_ORDER: LX.Quality[] = ['flac24bit', 'flac', '320k']
const LATENCY_TEST_POOL_SIZE = 5
const LATENCY_TEST_TARGET_CONCURRENCY = 2
const CANCEL_REQUEST_ERROR_MESSAGE = 'Cancel request'
const USER_API_ID_RXP = /^user_api/

interface LatencyTestSession {
  aborted: boolean
  apiId: string
  cancelAcquire: null | (() => void)
  controller: UserApiRuntimeController | null
  cancel: () => Promise<void>
}

const activeLatencyTestSessions = new Map<string, Set<LatencyTestSession>>()
const createCancelRequestError = () => new Error(CANCEL_REQUEST_ERROR_MESSAGE)
const addActiveLatencyTestSession = (session: LatencyTestSession) => {
  let sessions = activeLatencyTestSessions.get(session.apiId)
  if (!sessions) {
    sessions = new Set()
    activeLatencyTestSessions.set(session.apiId, sessions)
  }
  sessions.add(session)
}
const removeActiveLatencyTestSession = (session: LatencyTestSession) => {
  const sessions = activeLatencyTestSessions.get(session.apiId)
  if (!sessions) return
  sessions.delete(session)
  if (!sessions.size) activeLatencyTestSessions.delete(session.apiId)
}
const isLatencyTestActive = (id: string) => !!activeLatencyTestSessions.get(id)?.size
const throwIfLatencyTestCancelled = (session?: LatencyTestSession | null) => {
  if (session?.aborted) throw createCancelRequestError()
}
const createLatencyTestSession = (apiId: string): LatencyTestSession => {
  const session: LatencyTestSession = {
    apiId,
    cancelAcquire: null,
    controller: null,
    aborted: false,
    async cancel() {
      if (session.aborted) return
      session.aborted = true
      session.cancelAcquire?.()
      session.cancelAcquire = null
      try {
        await session.controller?.closeWindow()
      } catch (err) {
        console.error(err)
      }
    },
  }
  addActiveLatencyTestSession(session)
  return session
}
const cancelTestSessions = async(ids: string[]) => {
  const tasks: Array<Promise<void>> = []
  for (const id of ids) {
    const sessions = activeLatencyTestSessions.get(id)
    if (!sessions?.size) continue
    for (const session of sessions) tasks.push(session.cancel())
  }
  await Promise.all(tasks)
}

const pickPlaybackTestQuality = (sourceInfo: LX.UserApi.UserApiSourceInfo, musicInfo: LX.Music.MusicInfoOnline): LX.Quality | null => {
  const availableQualitys = sourceInfo.qualitys.filter(type => musicInfo.meta._qualitys[type])
  if (!availableQualitys.length) return null

  const preferredQuality = global.lx.appSetting['player.playQuality'] as LX.Quality | undefined
  if (preferredQuality && PLAYBACK_HIGH_QUALITY_ORDER.includes(preferredQuality)) {
    const matchedQuality = PLAYBACK_HIGH_QUALITY_ORDER
      .slice(PLAYBACK_HIGH_QUALITY_ORDER.indexOf(preferredQuality))
      .find(type => availableQualitys.includes(type))
    if (matchedQuality) return matchedQuality
  }

  if (availableQualitys.includes('128k')) return '128k'
  return availableQualitys[0] ?? null
}

const normalizeTestSampleList = (sampleValue?: LX.UserApi.UserApiLatencyTestSampleValue): LX.Music.MusicInfoOnline[] => {
  if (!sampleValue) return []
  return Array.isArray(sampleValue) ? sampleValue : [sampleValue]
}

const pickTestTargets = (samples: LX.UserApi.UserApiLatencyTestParams['samples'], sources?: Partial<LX.UserApi.UserApiSources>) => {
  if (!sources) return []
  const targets: Array<{
    source: LX.Source
    quality: LX.Quality
    musicInfo: LX.Music.MusicInfoOnline
  }> = []
  for (const source of TEST_SOURCE_ORDER) {
    const sourceInfo = sources[source]
    if (!sourceInfo || sourceInfo.type !== 'music' || !sourceInfo.actions.includes('musicUrl')) continue
    for (const musicInfo of normalizeTestSampleList(samples[source])) {
      const quality = pickPlaybackTestQuality(sourceInfo, musicInfo)
      if (!quality) continue
      targets.push({
        source,
        quality,
        musicInfo,
      })
    }
  }
  return targets
}

const requestLatencyTestTarget = async(controller: UserApiRuntimeController, target: {
  source: LX.Source
  quality: LX.Quality
  musicInfo: LX.Music.MusicInfoOnline
}, requestKey: string) => {
  const result = await controller.withRendererEventsSilenced(async() => controller.request({
    requestKey,
    data: {
      source: target.source,
      action: 'musicUrl',
      info: {
        type: target.quality,
        musicInfo: target.musicInfo,
      },
    },
  }))
  if (result?.__cancelled__) throw new Error('Cancel request')

  const url = result?.data?.url
  if (typeof url !== 'string' || !/^https?:/.test(url)) throw new Error('未获取到有效播放链接')
  return {
    musicInfo: target.musicInfo,
    source: target.source,
    quality: target.quality,
    url,
  }
}

const requestLatencyTestTargets = async(controller: UserApiRuntimeController, targets: Array<{
  source: LX.Source
  quality: LX.Quality
  musicInfo: LX.Music.MusicInfoOnline
}>, session?: LatencyTestSession) => new Promise<{
  musicInfo: LX.Music.MusicInfoOnline
  source: LX.Source
  quality: LX.Quality
  url: string
  requestLatency: number
}>((resolve, reject) => {
  const maxConcurrency = Math.max(1, Math.min(LATENCY_TEST_TARGET_CONCURRENCY, targets.length))
  const phaseStart = Date.now()
  const pendingRequestKeys = new Set<string>()
  let nextIndex = 0
  let activeCount = 0
  let settled = false
  let lastError: Error | null = null

  const launch = () => {
    if (session?.aborted) {
      settled = true
      reject(createCancelRequestError())
      return
    }
    if (settled) return
    while (activeCount < maxConcurrency && nextIndex < targets.length) {
      const target = targets[nextIndex++]
      const requestKey = `request_test__${Math.random().toString().substring(2)}`
      activeCount++
      pendingRequestKeys.add(requestKey)
      void requestLatencyTestTarget(controller, target, requestKey).then(result => {
        pendingRequestKeys.delete(requestKey)
        activeCount--
        if (settled) return
        settled = true
        for (const pendingKey of pendingRequestKeys) controller.cancelRequest(pendingKey)
        pendingRequestKeys.clear()
        resolve({
          ...result,
          requestLatency: Date.now() - phaseStart,
        })
      }).catch(err => {
        pendingRequestKeys.delete(requestKey)
        activeCount--
        if (settled) return
        if (!(err instanceof Error && err.message === 'Cancel request')) {
          lastError = err instanceof Error ? err : new Error(String(err))
        }
        if (nextIndex < targets.length) {
          launch()
          return
        }
        if (activeCount === 0) {
          settled = true
          reject(session?.aborted ? createCancelRequestError() : (lastError ?? new Error('未获取到有效播放链接')))
        }
      })
    }
  }

  launch()
})

const runApiLatencyTest = async(controller: UserApiRuntimeController, { id, samples }: LX.UserApi.UserApiLatencyTestParams, session?: LatencyTestSession): Promise<LX.UserApi.UserApiLatencyTestResult> => {
  if (!samples || !Object.keys(samples).length) throw new Error('没有可用的测试歌曲')
  const totalStart = Date.now()
  let initDuration = 0
  try {
    throwIfLatencyTestCancelled(session)
    const needSwitch = controller.getCurrentApiId() !== id
    const initStart = Date.now()
    if (needSwitch) {
      const switched = await controller.switchApi(id, { silent: true, waitReady: true })
      if (!switched) throw new Error('api not found')
    } else {
      await controller.waitForApiReady(id)
    }
    throwIfLatencyTestCancelled(session)
    initDuration = Date.now() - initStart

    const status = await controller.waitForApiReady(id)
    throwIfLatencyTestCancelled(session)
    const targets = pickTestTargets(samples, status.apiInfo?.sources)
    if (!targets.length) throw new Error('当前源没有可自动测试的在线平台')
    const result = await requestLatencyTestTargets(controller, targets, session)
    throwIfLatencyTestCancelled(session)
    return {
      id,
      success: true,
      source: result.source,
      quality: result.quality,
      musicInfo: result.musicInfo,
      url: result.url,
      latency: Date.now() - totalStart,
      initLatency: initDuration,
      requestLatency: result.requestLatency,
    }
  } catch (err) {
    if (session?.aborted) throw createCancelRequestError()
    throw err
  } finally {
    try {
      await controller.closeWindow()
    } catch (err) {
      console.error(err)
    }
  }
}

class UserApiLatencyTestPool {
  private readonly availableWorkers: Array<{
    id: number
    controller: UserApiRuntimeController
  }>

  private readonly waiters: Array<{
    reject: (error: Error) => void
    resolve: (worker: {
      id: number
      controller: UserApiRuntimeController
    }) => void
    session?: LatencyTestSession
  }> = []

  private readonly workers: Array<{
    id: number
    controller: UserApiRuntimeController
  }>

  constructor(size: number) {
    const workerCount = Math.max(1, size)
    this.workers = Array.from({ length: workerCount }, (_value, index) => ({
      id: index,
      controller: createUserApiRuntimeController({
        id: `latency_test_${index + 1}`,
        suppressStatusChange: true,
        suppressUpdateAlert: true,
      }),
    }))
    this.availableWorkers = [...this.workers]
  }

  public async close() {
    const closeTasks = this.workers.map(async worker => worker.controller.destroy())
    this.availableWorkers.length = 0
    for (const waiter of this.waiters.splice(0)) waiter.reject(createCancelRequestError())
    await Promise.all(closeTasks)
  }

  public async run(params: LX.UserApi.UserApiLatencyTestParams, session?: LatencyTestSession) {
    const worker = await this.acquire(session)
    if (session) session.controller = worker.controller
    try {
      throwIfLatencyTestCancelled(session)
      return await runApiLatencyTest(worker.controller, params, session)
    } finally {
      if (session?.controller === worker.controller) session.controller = null
      this.release(worker)
    }
  }

  private readonly acquire = async(session?: LatencyTestSession) => {
    const worker = this.availableWorkers.shift()
    if (worker) {
      if (session) session.cancelAcquire = null
      return worker
    }
    return new Promise<{
      id: number
      controller: UserApiRuntimeController
    }>((resolve, reject) => {
      const waiter = {
        resolve: (nextWorker: {
          id: number
          controller: UserApiRuntimeController
        }) => {
          if (session) session.cancelAcquire = null
          resolve(nextWorker)
        },
        reject,
        session,
      }
      const cancelAcquire = () => {
        const index = this.waiters.indexOf(waiter)
        if (index < 0) return
        this.waiters.splice(index, 1)
        reject(createCancelRequestError())
      }
      if (session) {
        if (session.aborted) {
          reject(createCancelRequestError())
          return
        }
        session.cancelAcquire = cancelAcquire
      }
      this.waiters.push(waiter)
    })
  }

  private release(worker: {
    id: number
    controller: UserApiRuntimeController
  }) {
    const waiter = this.waiters.shift()
    if (waiter) {
      waiter.resolve(worker)
      return
    }
    this.availableWorkers.push(worker)
  }
}

let latencyTestPool: UserApiLatencyTestPool | null = null
const getLatencyTestPool = () => {
  latencyTestPool ??= new UserApiLatencyTestPool(LATENCY_TEST_POOL_SIZE)
  return latencyTestPool
}

export const getApiList = getUserApis

export const importApi = async(params: string | LX.UserApi.ImportUserApiParams): Promise<LX.UserApi.ImportUserApi> => {
  return {
    apiInfo: await handleImportApi(params),
    apiList: getUserApis(),
  }
}

export const exportApi = async(ids: string[]): Promise<LX.UserApi.UserApiExportItem[]> => {
  return handleExportApi(ids)
}

export const removeApi = async(ids: string[]): Promise<LX.UserApi.UserApiInfo[]> => {
  if (ids.some(id => isLatencyTestActive(id))) await cancelTestSessions(ids)
  const currentApiId = defaultUserApiRuntimeController.getCurrentApiId()
  if (currentApiId && ids.includes(currentApiId)) {
    await defaultUserApiRuntimeController.closeWindow()
  }
  handleRemoveApi(ids)
  return getUserApis()
}

export const setApi = async(id: string) => {
  if (!USER_API_ID_RXP.test(id)) {
    await defaultUserApiRuntimeController.closeWindow()
    return
  }
  const switched = await defaultUserApiRuntimeController.switchApi(id)
  if (!switched) {
    await defaultUserApiRuntimeController.closeWindow()
    throw new Error('api not found')
  }
}

export const setAllowShowUpdateAlert = (id: string, enable: boolean) => {
  saveAllowShowUpdateAlert(id, enable)
  setRendererEventAllowShowUpdateAlert(id, enable)
}

export const cancelTestApiLatency = async(id: LX.UserApi.UserApiLatencyTestCancelParams) => {
  await cancelTestSessions([id])
}

export const testApiLatency = async(params: LX.UserApi.UserApiLatencyTestParams): Promise<LX.UserApi.UserApiLatencyTestResult> => {
  const session = createLatencyTestSession(params.id)
  try {
    return await getLatencyTestPool().run(params, session)
  } finally {
    removeActiveLatencyTestSession(session)
  }
}

export * from './rendererEvent/rendererEvent'

export default () => {
  init()

  global.lx.event_app.on('main_window_close', () => {
    void closeWindow()
    if (latencyTestPool) {
      const pool = latencyTestPool
      latencyTestPool = null
      void pool.close()
    }
  })
}
