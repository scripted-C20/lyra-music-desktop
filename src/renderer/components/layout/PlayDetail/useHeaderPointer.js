import { onBeforeUnmount } from '@common/utils/vueTools'
import { startWindowMove, stopWindowMove } from '@renderer/utils/ipc'

const DRAG_THRESHOLD = 4
const DOUBLE_CLICK_INTERVAL = 300
const DOUBLE_CLICK_DISTANCE = 8

export default ({ isFullscreen, isWindowMaximized, onDoubleClick }) => {
  let activePointerId = null
  let captureTarget = null
  let startScreenX = 0
  let startScreenY = 0
  let startClientX = 0
  let startClientY = 0
  let isDragging = false
  let hasStartedWindowMove = false
  const lastClick = {
    time: 0,
    x: 0,
    y: 0,
  }

  const cleanupListeners = () => {
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)
    document.removeEventListener('pointercancel', handlePointerCancel)
  }

  const resetPointer = () => {
    if (hasStartedWindowMove) stopWindowMove()

    activePointerId = null
    captureTarget = null
    isDragging = false
    hasStartedWindowMove = false
  }

  const isPrimaryPointer = (event) => {
    return event.pointerType == 'touch' || event.button == 0
  }

  const canMoveWindow = () => {
    return !isFullscreen.value && !isWindowMaximized.value
  }

  const maybeHandleDoubleClick = (event) => {
    const now = window.performance.now()
    const isDoubleClick = now - lastClick.time < DOUBLE_CLICK_INTERVAL &&
      Math.abs(event.clientX - lastClick.x) < DOUBLE_CLICK_DISTANCE &&
      Math.abs(event.clientY - lastClick.y) < DOUBLE_CLICK_DISTANCE

    lastClick.time = now
    lastClick.x = event.clientX
    lastClick.y = event.clientY

    if (!isDoubleClick) return
    lastClick.time = 0
    onDoubleClick(event)
  }

  function handlePointerMove(event) {
    if (activePointerId == null || event.pointerId !== activePointerId) return

    const deltaX = event.clientX - startClientX
    const deltaY = event.clientY - startClientY
    if (!isDragging && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return

    event.preventDefault()
    isDragging = true

    if (!hasStartedWindowMove && canMoveWindow()) {
      startWindowMove({
        screenX: startScreenX,
        screenY: startScreenY,
      })
      hasStartedWindowMove = true
    }
  }

  function handlePointerUp(event) {
    if (activePointerId == null || event.pointerId !== activePointerId) return
    cleanupListeners()

    try {
      captureTarget?.releasePointerCapture?.(event.pointerId)
    } catch {
      // Some Electron builds can throw if capture was already released.
    }

    if (!isDragging) maybeHandleDoubleClick(event)
    resetPointer()
  }

  function handlePointerCancel(event) {
    if (activePointerId == null || event.pointerId !== activePointerId) return
    cleanupListeners()

    try {
      captureTarget?.releasePointerCapture?.(event.pointerId)
    } catch {
      // Some Electron builds can throw if capture was already released.
    }

    resetPointer()
  }

  const handleHeaderPointerDown = (event) => {
    if (!isPrimaryPointer(event)) return

    event.preventDefault()
    event.stopPropagation()

    activePointerId = event.pointerId
    captureTarget = event.currentTarget
    startScreenX = event.screenX
    startScreenY = event.screenY
    startClientX = event.clientX
    startClientY = event.clientY
    isDragging = false
    hasStartedWindowMove = false

    if (canMoveWindow()) {
      startWindowMove({
        screenX: startScreenX,
        screenY: startScreenY,
      })
      hasStartedWindowMove = true
    }

    try {
      captureTarget?.setPointerCapture?.(event.pointerId)
    } catch {
      // Pointer capture is a nice-to-have; document listeners still cover us.
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerCancel)
  }

  onBeforeUnmount(() => {
    cleanupListeners()
    resetPointer()
  })

  return {
    handleHeaderPointerDown,
  }
}
