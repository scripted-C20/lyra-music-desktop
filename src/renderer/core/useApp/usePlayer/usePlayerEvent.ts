import { onBeforeUnmount } from '@common/utils/vueTools'
import {
  onPlaying,
  onPause,
  onEnded,
  onError,
  onLoadeddata,
  onLoadstart,
  onCanplay,
  onEmptied,
  onWaiting,
  getErrorCode,
} from '@renderer/plugins/player'


export default () => {
  const rOnPlaying = onPlaying((resourceUrl) => {
    console.log('onPlaying')
    window.app_event.playerPlaying(resourceUrl)
    window.app_event.play()
  })
  const rOnPause = onPause(() => {
    console.log('onPause')
    window.app_event.playerPause()
    window.app_event.pause()
  })
  const rOnEnded = onEnded((resourceUrl) => {
    console.log('onEnded')
    window.app_event.playerEnded(resourceUrl)
    // window.app_event.pause()
  })
  const rOnError = onError((resourceUrl) => {
    console.log('onError')
    const errorCode = getErrorCode()
    window.app_event.error(errorCode)
    window.app_event.playerError(errorCode, resourceUrl)
  })
  const rOnLoadeddata = onLoadeddata((resourceUrl) => {
    console.log('onLoadeddata')
    window.app_event.playerLoadeddata(resourceUrl)
  })
  const rOnLoadstart = onLoadstart((resourceUrl) => {
    console.log('onLoadstart')
    window.app_event.playerLoadstart(resourceUrl)
  })
  const rOnCanplay = onCanplay((resourceUrl) => {
    console.log('onCanplay')
    window.app_event.playerCanplay(resourceUrl)
  })
  const rOnEmptied = onEmptied(() => {
    console.log('onEmptied')
    window.app_event.playerEmptied()
    // window.app_event.stop()
  })
  const rOnWaiting = onWaiting((resourceUrl) => {
    console.log('onWaiting')
    window.app_event.pause()
    window.app_event.playerWaiting(resourceUrl)
  })


  onBeforeUnmount(() => {
    rOnPlaying()
    rOnPause()
    rOnEnded()
    rOnError()
    rOnLoadeddata()
    rOnLoadstart()
    rOnCanplay()
    rOnEmptied()
    rOnWaiting()
  })
}
