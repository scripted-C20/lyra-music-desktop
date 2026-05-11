declare namespace LX {
  namespace UserApi {
    type UserApiSourceInfoType = 'music'
    type UserApiSourceInfoActions = 'musicUrl' | 'lyric' | 'pic'

    interface UserApiSourceInfo {
      name: string
      type: UserApiSourceInfoType
      actions: UserApiSourceInfoActions[]
      qualitys: LX.Quality[]
    }

    type UserApiSources = Record<LX.Source, UserApiSourceInfo>

    type UserApiOriginType = 'local' | 'subscribe'

    interface UserApiOriginInfo {
      type: UserApiOriginType
      subscribeName?: string
      subscribeUrl?: string
    }

    interface UserApiInfoFull {
      id: string
      name: string
      description: string
      script: string
      allowShowUpdateAlert: boolean
      origin?: UserApiOriginInfo
      author?: string
      homepage?: string
      version?: string
      sources?: UserApiSources
    }

    type UserApiInfo = Omit<UserApiInfoFull, 'script'>

    interface UserApiStatus {
      status: boolean
      message?: string
      apiInfo?: UserApiInfo
    }

    interface UserApiUpdateInfo {
      name: string
      description: string
      log: string
      updateUrl?: string
    }

    interface UserApiRequestParams {
      requestKey: string
      data: any
    }
    type UserApiRequestCancelParams = string
    type UserApiSetApiParams = string

    type UserApiLatencyTestSampleValue = LX.Music.MusicInfoOnline | LX.Music.MusicInfoOnline[]
    type UserApiLatencyTestSamples = Partial<Record<LX.Source, UserApiLatencyTestSampleValue>>

    interface UserApiLatencyTestParams {
      id: string
      samples: UserApiLatencyTestSamples
    }
    type UserApiLatencyTestCancelParams = string

    interface UserApiLatencyTestResult {
      id: string
      success: boolean
      latency: number
      initLatency: number
      requestLatency: number
      verifyLatency?: number
      musicInfo?: LX.Music.MusicInfoOnline
      source?: LX.Source
      quality?: LX.Quality
      url?: string
      message?: string
    }

    interface UserApiSetAllowUpdateAlertParams {
      id: string
      enable: boolean
    }

    interface ImportUserApiParams {
      script: string
      origin?: UserApiOriginInfo
    }

    type UserApiExportParams = string[]

    interface UserApiExportItem {
      id: string
      name: string
      description: string
      script: string
      author?: string
      homepage?: string
      version?: string
    }

    interface ImportUserApi {
      apiInfo: UserApiInfo
      apiList: UserApiInfo[]
    }

    interface UserApiSubscribeSourceInfo {
      name: string
      url: string
      description?: string
      author?: string
      version?: string
      homepage?: string
    }

    interface ImportUserApiSubscribeResult {
      success: boolean
      apiInfo?: UserApiInfo
      message?: string
    }

  }
}
