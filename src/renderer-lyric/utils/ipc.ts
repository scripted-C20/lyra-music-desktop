import { rendererSend, rendererInvoke, rendererOn, rendererOff } from '@common/rendererIpc'
import { CMMON_EVENT_NAME, WIN_LYRIC_RENDERER_EVENT_NAME } from '@common/ipcNames'

type RemoveListener = () => void
const interactionClassName = 'window-interacting'
const setWindowInteractionClass = (active: boolean) => {
  if (typeof document == 'undefined') return
  try {
    document.documentElement?.classList?.toggle(interactionClassName, active)
    document.body?.classList?.toggle(interactionClassName, active)
  } catch {
    // ignore DOM sync failures during window teardown / hot reload
  }
}

export const getSetting = async() => {
  return rendererInvoke<LX.DesktopLyric.Config>(WIN_LYRIC_RENDERER_EVENT_NAME.get_config)
}
export const updateSetting = async(setting: Partial<LX.DesktopLyric.Config>) => {
  await rendererInvoke(WIN_LYRIC_RENDERER_EVENT_NAME.set_config, setting)
}
export const onSettingChanged = (listener: LX.IpcRendererEventListenerParams<Partial<LX.DesktopLyric.Config>>): RemoveListener => {
  rendererOn<Partial<LX.DesktopLyric.Config>>(WIN_LYRIC_RENDERER_EVENT_NAME.on_config_change, listener)
  return () => {
    rendererOff(WIN_LYRIC_RENDERER_EVENT_NAME.on_config_change, listener)
  }
}
export const setWindowBounds = (bounds: LX.DesktopLyric.NewBounds) => {
  rendererSend<LX.DesktopLyric.NewBounds>(WIN_LYRIC_RENDERER_EVENT_NAME.set_win_bounds, bounds)
}
export const setWindowInteractionActive = (active: boolean) => {
  setWindowInteractionClass(active)
}
export const syncWindowInteractionState = (origin: LX.DesktopLyric.WindowInteractionOrigin | null) => {
  rendererSend<LX.DesktopLyric.WindowInteractionOrigin | null>(WIN_LYRIC_RENDERER_EVENT_NAME.set_win_interaction_state, origin)
}
export const startWindowInteraction = (payload: LX.DesktopLyric.StartWindowInteraction) => {
  setWindowInteractionActive(true)
  rendererSend<LX.DesktopLyric.StartWindowInteraction>(WIN_LYRIC_RENDERER_EVENT_NAME.start_win_interaction, payload)
}
export const stopWindowInteraction = () => {
  setWindowInteractionActive(false)
  rendererSend(WIN_LYRIC_RENDERER_EVENT_NAME.stop_win_interaction)
}
let previousResizable: boolean | null = null
export const setWindowResizeable = (resizable: boolean) => {
  if (previousResizable === resizable) return
  previousResizable = resizable
  // https://github.com/electron/electron/issues/48352
  // rendererSend<boolean>(WIN_LYRIC_RENDERER_EVENT_NAME.set_win_resizeable, resizable)
}

export const sendConnectMainWindowEvent = () => {
  rendererSend(WIN_LYRIC_RENDERER_EVENT_NAME.request_main_window_channel)
}
export const onProvideMainWindowChannel = (listener: LX.IpcRendererEventListener): RemoveListener => {
  rendererOn(WIN_LYRIC_RENDERER_EVENT_NAME.provide_main_window_channel, listener)
  return () => {
    rendererOff(WIN_LYRIC_RENDERER_EVENT_NAME.provide_main_window_channel, listener)
  }
}
export const onMainWindowInited = (listener: LX.IpcRendererEventListener): RemoveListener => {
  rendererOn(WIN_LYRIC_RENDERER_EVENT_NAME.main_window_inited, listener)
  return () => {
    rendererOff(WIN_LYRIC_RENDERER_EVENT_NAME.main_window_inited, listener)
  }
}

export const sendMouseEnterLeave = (isEnter: boolean) => {
  rendererSend(WIN_LYRIC_RENDERER_EVENT_NAME.mouse_enter_leave, isEnter)
}
export const onMouseEnterLeave = (listener: LX.IpcRendererEventListenerParams<boolean>): RemoveListener => {
  rendererOn<boolean>(WIN_LYRIC_RENDERER_EVENT_NAME.mouse_enter_leave, listener)
  return () => {
    rendererOff(WIN_LYRIC_RENDERER_EVENT_NAME.mouse_enter_leave, listener)
  }
}

/**
 * On Theme Change
 * @param listener LX.IpcRendererEventListenerParams<shouldUseDarkColors: boolean>
 * @returns RemoveListener Fn
 */
export const onThemeChange = (listener: LX.IpcRendererEventListenerParams<LX.ThemeSetting>): RemoveListener => {
  rendererOn(CMMON_EVENT_NAME.theme_change, listener)
  return () => {
    rendererOff(CMMON_EVENT_NAME.theme_change, listener)
  }
}
