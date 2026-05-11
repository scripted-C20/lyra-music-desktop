export interface VerifyPlayableUrlTaskOptions {
  timeout: number
  minProgress?: number
  minPlayTime?: number
  failedMessage?: string
  timeoutMessage?: string
  cancelMessage?: string
}

const DEFAULT_MIN_PROGRESS = 0.15
const DEFAULT_MIN_PLAY_TIME = 800
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
    const failedMessage = options.failedMessage ?? DEFAULT_FAILED_MESSAGE
    const timeoutMessage = options.timeoutMessage ?? DEFAULT_TIMEOUT_MESSAGE
    const cancelMessage = options.cancelMessage ?? DEFAULT_CANCEL_MESSAGE
    let isSettled = false
    let timeoutId: NodeJS.Timeout | null = null
    let playingStartedAt = 0
    let hasStartedPlayback = false

    const cleanup = () => {
      audio.removeEventListener('canplay', handleCanplay)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('timeupdate', handleTimeupdate)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
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
    const verifyPlayback = () => {
      if (audio.currentTime >= minProgress) {
        settle(() => {
          resolve(Date.now() - startTime)
        })
        return
      }
      if (playingStartedAt && audio.currentTime > 0 && Date.now() - playingStartedAt >= minPlayTime) {
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
          handleError()
        })
      }
    }
    const handleCanplay = () => {
      startPlayback()
    }
    const handlePlaying = () => {
      playingStartedAt ||= Date.now()
      verifyPlayback()
    }
    const handleTimeupdate = () => {
      if (!playingStartedAt && audio.currentTime > 0) playingStartedAt = Date.now()
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
    audio.addEventListener('canplay', handleCanplay)
    audio.addEventListener('error', handleError)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('timeupdate', handleTimeupdate)
    audio.src = url
    audio.load()
    startPlayback()
  })

  return {
    cancel,
    promise,
  }
}
