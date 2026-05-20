export interface VerifyPlayableUrlTaskOptions {
  timeout: number
  minProgress?: number
  minPlayTime?: number
  minTimeupdateCount?: number
  allowHiddenRelaxedSuccess?: boolean
  hiddenMinReadyState?: number
  failedMessage?: string
  timeoutMessage?: string
  cancelMessage?: string
}

const DEFAULT_MIN_PROGRESS = 0.15
const DEFAULT_MIN_PLAY_TIME = 800
const DEFAULT_MIN_TIMEUPDATE_COUNT = 1
const DEFAULT_ALLOW_HIDDEN_RELAXED_SUCCESS = true
const DEFAULT_HIDDEN_MIN_READY_STATE = 2
const DEFAULT_FAILED_MESSAGE = 'play verify failed'
const DEFAULT_TIMEOUT_MESSAGE = 'play verify timeout'
const DEFAULT_CANCEL_MESSAGE = 'Cancel request'

export const createVerifyPlayableUrlTask = (url: string, options: VerifyPlayableUrlTaskOptions) => {
  let cancel = () => {}

  const promise = new Promise<number>((resolve, reject) => {
    const startTime = Date.now()
    const audio = new Audio()
    const timeout = Math.max(1, Math.trunc(options.timeout))
    const minProgress = options.minProgress ?? DEFAULT_MIN_PROGRESS
    const minPlayTime = options.minPlayTime ?? DEFAULT_MIN_PLAY_TIME
    const minTimeupdateCount = Math.max(1, Math.trunc(options.minTimeupdateCount ?? DEFAULT_MIN_TIMEUPDATE_COUNT))
    const allowHiddenRelaxedSuccess = options.allowHiddenRelaxedSuccess ?? DEFAULT_ALLOW_HIDDEN_RELAXED_SUCCESS
    const hiddenMinReadyState = Math.max(1, Math.trunc(options.hiddenMinReadyState ?? DEFAULT_HIDDEN_MIN_READY_STATE))
    const failedMessage = options.failedMessage ?? DEFAULT_FAILED_MESSAGE
    const timeoutMessage = options.timeoutMessage ?? DEFAULT_TIMEOUT_MESSAGE
    const cancelMessage = options.cancelMessage ?? DEFAULT_CANCEL_MESSAGE
    let isSettled = false
    let timeoutId: NodeJS.Timeout | null = null
    let hiddenCheckId: NodeJS.Timeout | null = null
    let playingStartedAt = 0
    let hasStartedPlayback = false
    let hasLoadedMetadata = false
    let timeupdateCount = 0
    let lastCurrentTime = 0

    const isDocumentBackgrounded = () => {
      if (typeof document == 'undefined') return false
      return document.hidden || (typeof document.hasFocus == 'function' && !document.hasFocus())
    }
    const canUseHiddenRelaxedSuccess = () => {
      return allowHiddenRelaxedSuccess && isDocumentBackgrounded()
    }
    const hasBufferedRange = () => {
      try {
        return audio.buffered.length > 0 && audio.buffered.end(audio.buffered.length - 1) > 0
      } catch {
        return false
      }
    }
    const hasSeekableRange = () => {
      try {
        return audio.seekable.length > 0 && audio.seekable.end(audio.seekable.length - 1) >= 0
      } catch {
        return false
      }
    }
    const hasLoadedPlayableMetadata = () => {
      return hasLoadedMetadata ||
        (Number.isFinite(audio.duration) && audio.duration > 0) ||
        hasBufferedRange() ||
        hasSeekableRange()
    }
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', handleLoadedmetadata)
      audio.removeEventListener('loadeddata', handleLoadeddata)
      audio.removeEventListener('canplay', handleCanplay)
      audio.removeEventListener('progress', handleProgress)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('timeupdate', handleTimeupdate)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (hiddenCheckId) {
        clearInterval(hiddenCheckId)
        hiddenCheckId = null
      }
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    const settle = (handler: () => void) => {
      if (isSettled) return
      isSettled = true
      cleanup()
      handler()
    }
    const handleError = () => {
      settle(() => {
        reject(new Error(failedMessage))
      })
    }
    const verifyHiddenReadyState = () => {
      if (!canUseHiddenRelaxedSuccess()) return
      if (audio.readyState < hiddenMinReadyState) return
      if (!hasLoadedPlayableMetadata()) return
      settle(() => {
        resolve(Date.now() - startTime)
      })
    }
    const verifyPlayback = () => {
      if (
        audio.currentTime >= minProgress &&
        playingStartedAt &&
        Date.now() - playingStartedAt >= minPlayTime &&
        timeupdateCount >= minTimeupdateCount
      ) {
        settle(() => {
          resolve(Date.now() - startTime)
        })
      }
    }
    const startPlayback = () => {
      if (hasStartedPlayback) return
      hasStartedPlayback = true
      const playPromise = audio.play()
      if (typeof playPromise?.catch == 'function') {
        playPromise.catch(() => {
          if (canUseHiddenRelaxedSuccess()) {
            verifyHiddenReadyState()
            return
          }
          handleError()
        })
      }
    }
    const handleLoadedmetadata = () => {
      hasLoadedMetadata = true
      verifyHiddenReadyState()
    }
    const handleLoadeddata = () => {
      verifyHiddenReadyState()
    }
    const handleCanplay = () => {
      verifyHiddenReadyState()
      startPlayback()
    }
    const handleProgress = () => {
      verifyHiddenReadyState()
    }
    const handlePlaying = () => {
      playingStartedAt ||= Date.now()
      verifyPlayback()
    }
    const handleTimeupdate = () => {
      if (!playingStartedAt && audio.currentTime > 0) playingStartedAt = Date.now()
      if (audio.currentTime > lastCurrentTime) {
        timeupdateCount++
        lastCurrentTime = audio.currentTime
      }
      verifyPlayback()
    }

    cancel = () => {
      settle(() => {
        reject(new Error(cancelMessage))
      })
    }
    timeoutId = setTimeout(() => {
      settle(() => {
        reject(new Error(timeoutMessage))
      })
    }, timeout)

    audio.controls = false
    audio.preload = 'auto'
    audio.crossOrigin = 'anonymous'
    audio.muted = true
    audio.volume = 0
    audio.autoplay = false
    audio.addEventListener('loadedmetadata', handleLoadedmetadata)
    audio.addEventListener('loadeddata', handleLoadeddata)
    audio.addEventListener('canplay', handleCanplay)
    audio.addEventListener('progress', handleProgress)
    audio.addEventListener('error', handleError)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('timeupdate', handleTimeupdate)
    hiddenCheckId = setInterval(() => {
      verifyHiddenReadyState()
    }, 250)
    audio.src = url
    audio.load()
    startPlayback()
  })

  return {
    cancel,
    promise,
  }
}
