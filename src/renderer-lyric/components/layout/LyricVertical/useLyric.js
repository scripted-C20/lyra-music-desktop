import { ref, onMounted, onBeforeUnmount, watch, nextTick } from '@common/utils/vueTools'
import { scrollXRTo } from '@common/utils/renderer'
import { lyric } from '@lyric/store/lyric'
import { isPlay, setting } from '@lyric/store/state'
import { startWindowInteraction, stopWindowInteraction } from '@lyric/utils/ipc'

const getOffsetTop = (contentWidth, lineWidth) => {
  switch (setting['desktopLyric.scrollAlign']) {
    case 'top': return contentWidth - lineWidth - 2
    default: return contentWidth * 0.5 - lineWidth / 2
  }
}

export default (isComputeWidth) => {
  const dom_lyric = ref(null)
  const dom_lyric_text = ref(null)
  const isMsDown = ref(false)
  let isStopScroll = false
  let activePointerId = null

  let timeout = null
  let cancelScrollFn
  let dom_lines
  let line_widths
  let isSetedLines = false
  let prevActiveLine = 0


  const handleScrollLrc = (duration = 300) => {
    if (!dom_lines?.length || !dom_lyric.value) return
    if (isStopScroll) return
    let dom_p = dom_lines[lyric.line]

    if (dom_p) {
      let offset = 0
      if (isComputeWidth.value) {
        let prevLineWidth = line_widths[prevActiveLine] ?? 0
        offset = prevActiveLine < lyric.line ? ((dom_lines[prevActiveLine]?.clientWidth ?? 0) - prevLineWidth) : 0
        // console.log(prevActiveLine, dom_lines[prevActiveLine]?.clientHeight ?? 0, prevLineWidth, offset)
      }
      cancelScrollFn = scrollXRTo(dom_lyric.value, dom_p ? (dom_p.offsetLeft + offset - getOffsetTop(dom_lyric.value.clientWidth, dom_p.clientWidth)) : 0, duration)
    } else {
      cancelScrollFn = scrollXRTo(dom_lyric.value, 0, duration)
    }
  }
  const clearLyricScrollTimeout = () => {
    if (!timeout) return
    clearTimeout(timeout)
    timeout = null
  }
  const startLyricScrollTimeout = () => {
    clearLyricScrollTimeout()
    timeout = setTimeout(() => {
      timeout = null
      isStopScroll = false
      if (!isPlay.value) return
      handleScrollLrc()
    }, 3000)
  }
  const handleLyricDown = event => {
    if (delayScrollTimeout) {
      clearTimeout(delayScrollTimeout)
      delayScrollTimeout = null
    }
    isMsDown.value = true
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
  const handleLyricPointerDown = event => {
    if (event.button !== 0 && event.pointerType !== 'touch') return
    handleLyricDown(event)
  }
  const stopMove = () => {
    if (activePointerId == null) return
    isMsDown.value = false
    activePointerId = null
    stopWindowInteraction()
  }
  const handlePointerUp = event => {
    if (activePointerId == null) return
    if (event.pointerId !== activePointerId) return
    stopMove()
  }

  const handleWheel = (event) => {
    if (cancelScrollFn) {
      cancelScrollFn()
      cancelScrollFn = null
    }
    dom_lyric.value.scrollLeft = dom_lyric.value.scrollLeft - event.deltaY
    startLyricScrollTimeout()
  }

  const setLyric = (lines) => {
    const dom_line_content = document.createDocumentFragment()
    for (const line of lines) {
      dom_line_content.appendChild(line.dom_line)
    }
    dom_lyric_text.value.textContent = ''
    dom_lyric_text.value.appendChild(dom_line_content)
    nextTick(() => {
      dom_lines = dom_lyric.value.querySelectorAll('.line-content')
      line_widths = Array.from(dom_lines).map(l => l.clientWidth)
      handleScrollLrc()
    })
  }

  const initLrc = (lines, oLines) => {
    prevActiveLine = 0
    isSetedLines = true
    if (oLines) {
      if (lines.length) {
        setLyric(lines)
      } else {
        cancelScrollFn = scrollXRTo(dom_lyric.value, 0, 300, () => {
          if (lyric.lines !== lines) return
          setLyric(lines)
        }, 50)
      }
    } else {
      setLyric(lines)
    }
  }

  let delayScrollTimeout
  const scrollLine = (line, oldLine) => {
    setImmediate(() => {
      prevActiveLine = line
    })
    if (line < 0) return
    if (line == 0 && isSetedLines) return isSetedLines = false
    isSetedLines &&= false
    if (oldLine == null || line - oldLine != 1) return handleScrollLrc()

    if (setting['desktopLyric.isDelayScroll']) {
      delayScrollTimeout = setTimeout(() => {
        delayScrollTimeout = null
        handleScrollLrc(600)
      }, 600)
    } else {
      handleScrollLrc()
    }
  }

  watch(() => lyric.lines, initLrc)
  watch(() => lyric.line, scrollLine)

  onMounted(() => {
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerUp)
    window.addEventListener('blur', stopMove)

    initLrc(lyric.lines, null)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('pointerup', handlePointerUp)
    document.removeEventListener('pointercancel', handlePointerUp)
    window.removeEventListener('blur', stopMove)
    stopMove()
  })

  return {
    dom_lyric,
    dom_lyric_text,
    isMsDown,
    handleLyricPointerDown,
    handleWheel,
  }
}
