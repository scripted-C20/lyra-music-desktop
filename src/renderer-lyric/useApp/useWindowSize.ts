import { setting } from '@lyric/store/state'
import { onBeforeUnmount, onMounted } from '@common/utils/vueTools'
import { startWindowInteraction, stopWindowInteraction } from '@lyric/utils/ipc'

type Origin = LX.DesktopLyric.ResizeOrigin

export default () => {
  let activePointerId: number | null = null

  const stopResize = () => {
    if (activePointerId == null) return
    activePointerId = null
    stopWindowInteraction()
  }

  const handlePointerDown = (origin: Origin, event: PointerEvent) => {
    if (setting['desktopLyric.isLock']) return
    if (event.button !== 0 && event.pointerType !== 'touch') return
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as Element | null
    if (target && 'setPointerCapture' in target) {
      try {
        target.setPointerCapture(event.pointerId)
      } catch {
        // ignore capture failures on unsupported targets
      }
    }
    activePointerId = event.pointerId
    startWindowInteraction({
      origin,
      screenX: event.screenX,
      screenY: event.screenY,
    })
  }
  const handlePointerUp = (event: PointerEvent) => {
    if (activePointerId == null) return
    if (event.pointerId !== activePointerId) return
    stopResize()
  }


  onMounted(() => {
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerUp)
    window.addEventListener('blur', stopResize)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('pointerup', handlePointerUp)
    document.removeEventListener('pointercancel', handlePointerUp)
    window.removeEventListener('blur', stopResize)
    stopResize()
  })

  return {
    handlePointerDown,
  }
}
