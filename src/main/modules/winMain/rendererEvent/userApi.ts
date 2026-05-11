import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { mainHandle, mainOn } from '@common/mainIpc'
import {
  getApiList,
  importApi,
  exportApi,
  removeApi,
  setApi,
  getStatus,
  request,
  cancelRequest,
  testApiLatency,
  cancelTestApiLatency,
  setAllowShowUpdateAlert,
} from '@main/modules/userApi'
import { sendEvent } from '@main/modules/winMain/main'

export default () => {
  mainHandle<string | LX.UserApi.ImportUserApiParams, LX.UserApi.ImportUserApi>(WIN_MAIN_RENDERER_EVENT_NAME.import_user_api, async({ params }) => {
    return importApi(params)
  })
  mainHandle<LX.UserApi.UserApiExportParams, LX.UserApi.UserApiExportItem[]>(WIN_MAIN_RENDERER_EVENT_NAME.export_user_api, async({ params: apiIds }) => {
    return exportApi(apiIds)
  })

  mainHandle<string[], LX.UserApi.UserApiInfo[]>(WIN_MAIN_RENDERER_EVENT_NAME.remove_user_api, async({ params: apiIds }) => {
    return removeApi(apiIds)
  })

  mainHandle<LX.UserApi.UserApiSetApiParams>(WIN_MAIN_RENDERER_EVENT_NAME.set_user_api, async({ params: apiId }) => {
    await setApi(apiId)
  })

  mainHandle<LX.UserApi.UserApiInfo[]>(WIN_MAIN_RENDERER_EVENT_NAME.get_user_api_list, async() => {
    return getApiList()
  })

  mainHandle<LX.UserApi.UserApiStatus>(WIN_MAIN_RENDERER_EVENT_NAME.get_user_api_status, async() => {
    return getStatus()
  })

  mainHandle<LX.UserApi.UserApiSetAllowUpdateAlertParams>(WIN_MAIN_RENDERER_EVENT_NAME.user_api_set_allow_update_alert, async({ params: { id, enable } }) => {
    setAllowShowUpdateAlert(id, enable)
  })

  mainHandle<LX.UserApi.UserApiRequestParams>(WIN_MAIN_RENDERER_EVENT_NAME.request_user_api, async({ params }) => {
    return request(params)
  })
  mainHandle<LX.UserApi.UserApiLatencyTestParams, LX.UserApi.UserApiLatencyTestResult>(WIN_MAIN_RENDERER_EVENT_NAME.user_api_test_latency, async({ params }) => {
    return testApiLatency(params)
  })
  mainOn<LX.UserApi.UserApiLatencyTestCancelParams>(WIN_MAIN_RENDERER_EVENT_NAME.user_api_test_latency_cancel, ({ params: apiId }) => {
    void cancelTestApiLatency(apiId)
  })
  mainOn<LX.UserApi.UserApiRequestCancelParams>(WIN_MAIN_RENDERER_EVENT_NAME.request_user_api_cancel, ({ params: requestKey }) => {
    cancelRequest(requestKey)
  })
}

export const sendStatusChange = (status: LX.UserApi.UserApiStatus) => {
  sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.user_api_status, status)
}
export const sendShowUpdateAlert = (info: LX.UserApi.UserApiUpdateInfo) => {
  sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.user_api_show_update_alert, info)
}
