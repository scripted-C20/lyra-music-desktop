import { userApis as defaultUserApis } from './config'
import { STORE_NAMES } from '@common/constants'
import getStore from '@main/utils/store'
import zlib from 'node:zlib'

let userApis: LX.UserApi.UserApiInfo[] | null
let scripts = new Map<string, string>()
type UserApiInfoFullStore = Omit<LX.UserApi.UserApiInfoFull, 'allowShowUpdateAlert'> & {
  allowShowUpdateAlert?: boolean | string | null
}

const normalizeAllowShowUpdateAlert = (value: UserApiInfoFullStore['allowShowUpdateAlert']) => {
  if (typeof value == 'string') return value.toLowerCase() === 'true'
  return value === true
}
const normalizeOriginText = (value?: string | null) => {
  return typeof value == 'string' ? value.trim() : ''
}
const getSubscribeOriginFallbackName = (subscribeUrl?: string) => {
  if (!subscribeUrl) return 'Subscription'
  try {
    const hostname = new URL(subscribeUrl).hostname.replace(/^www\./, '')
    return hostname || 'Subscription'
  } catch {
    return 'Subscription'
  }
}
const normalizeOriginInfo = (origin?: LX.UserApi.UserApiOriginInfo): LX.UserApi.UserApiOriginInfo => {
  const subscribeName = normalizeOriginText(origin?.subscribeName)
  const subscribeUrl = normalizeOriginText(origin?.subscribeUrl)
  if (origin?.type === 'subscribe' && (subscribeName || subscribeUrl)) {
    return {
      type: 'subscribe',
      subscribeName: subscribeName || getSubscribeOriginFallbackName(subscribeUrl),
      subscribeUrl,
    }
  }
  return { type: 'local' }
}
const normalizeImportParams = (params: string | LX.UserApi.ImportUserApiParams) => {
  if (typeof params == 'string') {
    return {
      script: params,
      origin: normalizeOriginInfo(),
    }
  }
  return {
    script: params.script,
    origin: normalizeOriginInfo(params.origin),
  }
}

const saveData = () => {
  getStore(STORE_NAMES.USER_API).set('userApis', userApis!.map(api => {
    return {
      ...api,
      script: scripts.get(api.id),
    }
  }))
}

export const getUserApis = (): LX.UserApi.UserApiInfo[] => {
  if (userApis) return userApis

  const electronStore_userApi = getStore(STORE_NAMES.USER_API)
  let infoFull = electronStore_userApi.get('userApis') as UserApiInfoFullStore[] | undefined
  let requiredUpdate = false
  if (infoFull) {
    for (let i = 0; i < infoFull.length; i++) {
      const api = infoFull[i]
      if (api.version != null) continue
      requiredUpdate ||= true
      try {
        infoFull.splice(i, 1, {
          ...parseScriptInfo(api.script),
          ...api,
        })
      } catch (e) {
        infoFull.splice(i, 1)
        i--
      }
    }
  } else {
    infoFull = defaultUserApis
    electronStore_userApi.set('userApis', infoFull)
  }
  userApis = infoFull.map(api => {
    const allowShowUpdateAlert = normalizeAllowShowUpdateAlert(api.allowShowUpdateAlert)
    requiredUpdate ||= allowShowUpdateAlert !== api.allowShowUpdateAlert
    const origin = normalizeOriginInfo(api.origin)
    requiredUpdate ||= JSON.stringify(origin) !== JSON.stringify(api.origin)
    const { script, ...info } = api
    scripts.set(api.id, script)
    return {
      ...info,
      allowShowUpdateAlert,
      origin,
    }
  })
  if (requiredUpdate) saveData()
  return userApis
}

const INFO_NAMES = {
  name: 24,
  description: 36,
  author: 56,
  homepage: 1024,
  version: 36,
} as const
type INFO_NAMES_Type = typeof INFO_NAMES
const matchInfo = (scriptInfo: string) => {
  const infoArr = scriptInfo.split(/\r?\n/)
  const rxp = /^\s?\*\s?@(\w+)\s(.+)$/
  const infos: Partial<Record<keyof typeof INFO_NAMES, string>> = {}
  for (const info of infoArr) {
    const result = rxp.exec(info)
    if (!result) continue
    const key = result[1] as keyof typeof INFO_NAMES
    if (INFO_NAMES[key] == null) continue
    infos[key] = result[2].trim()
  }

  for (const [key, len] of Object.entries(INFO_NAMES) as Array<{ [K in keyof INFO_NAMES_Type]: [K, INFO_NAMES_Type[K]] }[keyof INFO_NAMES_Type]>) {
    infos[key] ||= ''
    if (infos[key] == null) infos[key] = ''
    else if (infos[key].length > len) infos[key] = infos[key].substring(0, len) + '...'
  }

  return infos as Record<keyof typeof INFO_NAMES, string>
}
const parseScriptInfo = (script: string) => {
  const result = /^\/\*[\S|\s]+?\*\//.exec(script)
  if (!result) throw new Error('无效的自定义源文件')

  let scriptInfo = matchInfo(result[0])

  scriptInfo.name ||= `user_api_${new Date().toLocaleString()}`
  return scriptInfo
}
const deflateScript = async(script: string) => new Promise<string>((resolve, reject) => {
  zlib.deflate(Buffer.from(script, 'utf8'), (err, buf) => {
    if (err) {
      reject(err)
      return
    }
    resolve('gz_' + buf.toString('base64'))
  })
})
const inflateScript = async(script: string) => new Promise<string>((resolve, reject) => {
  if (script.startsWith('gz_')) {
    zlib.inflate(Buffer.from(script.substring(3), 'base64'), (err, buf) => {
      if (err) {
        reject(err)
        return
      }
      resolve(buf.toString('utf8'))
    })
  } else resolve(script)
})
export const importApi = async(params: string | LX.UserApi.ImportUserApiParams): Promise<LX.UserApi.UserApiInfo> => {
  const { script: scriptRaw, origin } = normalizeImportParams(params)
  let scriptInfo = parseScriptInfo(scriptRaw)
  const script = await deflateScript(scriptRaw)
  userApis ??= []
  for (const api of userApis) {
    const existingScript = scripts.get(api.id)
    if (existingScript === script) {
      throw new Error(`导入失败，脚本内容与已有的源「${api.name}」相同`)
    }
  }
  const apiInfo = {
    id: `user_api_${Math.random().toString().substring(2, 5)}_${Date.now()}`,
    ...scriptInfo,
    allowShowUpdateAlert: false,
    origin,
  }
  userApis.push(apiInfo)
  scripts.set(apiInfo.id, script)
  saveData()
  return apiInfo
}

export const exportApi = async(ids: string[]): Promise<LX.UserApi.UserApiExportItem[]> => {
  const apiMap = new Map(getUserApis().map(api => [api.id, api]))
  const exportList: LX.UserApi.UserApiExportItem[] = []
  for (const id of ids) {
    const api = apiMap.get(id)
    if (!api) continue
    exportList.push({
      id: api.id,
      name: api.name,
      description: api.description,
      author: api.author,
      homepage: api.homepage,
      version: api.version,
      script: await inflateScript(scripts.get(api.id) ?? ''),
    })
  }
  return exportList
}

export const removeApi = (ids: string[]) => {
  if (!userApis) return
  for (let index = userApis.length - 1; index > -1; index--) {
    if (ids.includes(userApis[index].id)) {
      scripts.delete(userApis[index].id)
      userApis.splice(index, 1)
    }
  }
  saveData()
}

export const setAllowShowUpdateAlert = (id: string, enable: boolean) => {
  const targetApi = userApis?.find(api => api.id == id)
  if (!targetApi) return
  targetApi.allowShowUpdateAlert = enable
  saveData()
}

export const setApiSources = (id: string, sources?: LX.UserApi.UserApiSources) => {
  if (!sources) return
  const targetApi = userApis?.find(api => api.id == id)
  if (!targetApi) return
  const prevSources = targetApi.sources
  if (prevSources && JSON.stringify(prevSources) === JSON.stringify(sources)) return
  targetApi.sources = sources
  saveData()
}

export const getScript = async(id: string) => {
  return inflateScript(scripts.get(id) ?? '')
}
