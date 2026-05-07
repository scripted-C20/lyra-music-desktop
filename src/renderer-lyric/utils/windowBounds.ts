const MIN_WIDTH = 38
const MIN_HEIGHT = 38

type ResizeOrigin = 'left'
| 'top'
| 'right'
| 'bottom'
| 'top-left'
| 'top-right'
| 'bottom-left'
| 'bottom-right'

interface WindowBoundsSnapshot {
  x: number
  y: number
  width: number
  height: number
}

let activeWindowInteractionStop: (() => void) | null = null

const activateWindowInteraction = (stop: () => void) => {
  if (activeWindowInteractionStop && activeWindowInteractionStop !== stop) {
    activeWindowInteractionStop()
  }
  activeWindowInteractionStop = stop
}

const deactivateWindowInteraction = (stop: () => void) => {
  if (activeWindowInteractionStop === stop) activeWindowInteractionStop = null
}

const getWindowBoundsSnapshot = (): WindowBoundsSnapshot => {
  return {
    x: window.screenX,
    y: window.screenY,
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

export const createWindowMoveController = () => {
  const state = {
    isActive: false,
    startPointerX: 0,
    startPointerY: 0,
    startWindowX: 0,
    startWindowY: 0,
    lastTargetX: 0,
    lastTargetY: 0,
  }

  const start = (screenX: number, screenY: number) => {
    stop()
    const bounds = getWindowBoundsSnapshot()
    state.isActive = true
    state.startPointerX = screenX
    state.startPointerY = screenY
    state.startWindowX = bounds.x
    state.startWindowY = bounds.y
    state.lastTargetX = bounds.x
    state.lastTargetY = bounds.y
    activateWindowInteraction(stop)
  }

  const stop = () => {
    state.isActive = false
    deactivateWindowInteraction(stop)
  }

  const build = (screenX: number, screenY: number): LX.DesktopLyric.NewBounds | null => {
    if (!state.isActive) return null

    const targetX = state.startWindowX + (screenX - state.startPointerX)
    const targetY = state.startWindowY + (screenY - state.startPointerY)

    if (targetX == state.lastTargetX && targetY == state.lastTargetY) return null
    state.lastTargetX = targetX
    state.lastTargetY = targetY

    return {
      x: targetX,
      y: targetY,
      w: 0,
      h: 0,
    }
  }

  return {
    start,
    stop,
    build,
  }
}

export const createWindowResizeController = () => {
  const state: {
    origin: ResizeOrigin | null
    startPointerX: number
    startPointerY: number
    startWindowX: number
    startWindowY: number
    startWidth: number
    startHeight: number
    lastTargetX: number
    lastTargetY: number
    lastTargetWidth: number
    lastTargetHeight: number
  } = {
    origin: null,
    startPointerX: 0,
    startPointerY: 0,
    startWindowX: 0,
    startWindowY: 0,
    startWidth: 0,
    startHeight: 0,
    lastTargetX: 0,
    lastTargetY: 0,
    lastTargetWidth: 0,
    lastTargetHeight: 0,
  }

  const start = (origin: ResizeOrigin, screenX: number, screenY: number) => {
    stop()
    const bounds = getWindowBoundsSnapshot()
    state.origin = origin
    state.startPointerX = screenX
    state.startPointerY = screenY
    state.startWindowX = bounds.x
    state.startWindowY = bounds.y
    state.startWidth = bounds.width
    state.startHeight = bounds.height
    state.lastTargetX = bounds.x
    state.lastTargetY = bounds.y
    state.lastTargetWidth = bounds.width
    state.lastTargetHeight = bounds.height
    activateWindowInteraction(stop)
  }

  const stop = () => {
    state.origin = null
    deactivateWindowInteraction(stop)
  }

  const build = (screenX: number, screenY: number): LX.DesktopLyric.NewBounds | null => {
    if (!state.origin) return null

    const deltaPointerX = screenX - state.startPointerX
    const deltaPointerY = screenY - state.startPointerY

    let targetX = state.startWindowX
    let targetY = state.startWindowY
    let targetWidth = state.startWidth
    let targetHeight = state.startHeight

    switch (state.origin) {
      case 'left':
        targetX += deltaPointerX
        targetWidth -= deltaPointerX
        break
      case 'right':
        targetWidth += deltaPointerX
        break
      case 'top':
        targetY += deltaPointerY
        targetHeight -= deltaPointerY
        break
      case 'bottom':
        targetHeight += deltaPointerY
        break
      case 'top-left':
        targetX += deltaPointerX
        targetWidth -= deltaPointerX
        targetY += deltaPointerY
        targetHeight -= deltaPointerY
        break
      case 'top-right':
        targetWidth += deltaPointerX
        targetY += deltaPointerY
        targetHeight -= deltaPointerY
        break
      case 'bottom-left':
        targetX += deltaPointerX
        targetWidth -= deltaPointerX
        targetHeight += deltaPointerY
        break
      case 'bottom-right':
        targetWidth += deltaPointerX
        targetHeight += deltaPointerY
        break
    }

    if (targetWidth < MIN_WIDTH) {
      if (state.origin.includes('left')) targetX = state.startWindowX + state.startWidth - MIN_WIDTH
      targetWidth = MIN_WIDTH
    }
    if (targetHeight < MIN_HEIGHT) {
      if (state.origin.includes('top')) targetY = state.startWindowY + state.startHeight - MIN_HEIGHT
      targetHeight = MIN_HEIGHT
    }

    if (
      targetX == state.lastTargetX &&
      targetY == state.lastTargetY &&
      targetWidth == state.lastTargetWidth &&
      targetHeight == state.lastTargetHeight
    ) return null

    state.lastTargetX = targetX
    state.lastTargetY = targetY
    state.lastTargetWidth = targetWidth
    state.lastTargetHeight = targetHeight

    return {
      x: targetX,
      y: targetY,
      w: targetWidth,
      h: targetHeight,
    }
  }

  return {
    start,
    stop,
    build,
  }
}
