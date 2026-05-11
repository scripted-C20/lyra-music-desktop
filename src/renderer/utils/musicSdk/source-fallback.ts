import apiSourceInfo from './api-source-info'

export const builtinOnlineSourceIds: LX.OnlineSource[] = ['kw', 'kg', 'tx', 'wy', 'mg']

export const getBuiltinSourceIds = (): string[] => {
  const configuredIds = apiSourceInfo
    .filter(api => !api.disabled && builtinOnlineSourceIds.includes(api.id as LX.OnlineSource))
    .map(api => api.id)
  return configuredIds.length ? configuredIds : [...builtinOnlineSourceIds]
}

export const getBuiltinFallbackSourceId = (excludeIds: string[] = []): string => {
  return getBuiltinSourceIds().find(id => !excludeIds.includes(id)) ?? ''
}
