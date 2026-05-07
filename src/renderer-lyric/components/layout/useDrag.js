import { onMounted, onBeforeUnmount } from '@common/utils/vueTools'
import { startWindowInteraction, stopWindowInteraction } from '@lyric/utils/ipc'

export default () => {
  let activePointerId = null

  const stopDrag = () => {
    if (activePointerId == null) return
    activePointerId = null
    stopWindowInteraction()
  }
  const handleLyricPointerDown = event => {
    if (event.button !== 0 && event.pointerType !== 'touch') return
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    event.stopPropagation()
    if ('setPointerCapture' in event.currentTarget) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // ignore capture failures on unsupported targets
      }
    }
    activePointerId = event.pointerId
    startWindowInteraction({
      origin: 'move',
      screenX: event.screenX,
      screenY: event.screenY,
    })
  }
  const handlePointerUp = event => {
    if (activePointerId == null) return
    if (event.pointerId !== activePointerId) return
    stopDrag()
  }

  onMounted(() => {
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerUp)
    window.addEventListener('blur', stopDrag)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('pointerup', handlePointerUp)
    document.removeEventListener('pointercancel', handlePointerUp)
    window.removeEventListener('blur', stopDrag)
    stopDrag()
  })

  return {
    handleLyricPointerDown,
  }
}
