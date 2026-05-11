import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { onTimeupdate, getCurrentTime } from '@renderer/plugins/player'
import { playProgress } from '@renderer/store/player/playProgress'
import { musicInfo } from '@renderer/store/player/state'
// import { getList } from '@renderer/store/utils'
import { getNextPlayMusicInfo, resetRandomNextMusicInfo } from '@renderer/core/player'
import { getPlaybackMusicUrlTaskOptions } from '@renderer/core/player/utils'
import { createGetMusicUrlTask } from '@renderer/core/music'
import { savePreloadedMusicUrl } from '@renderer/core/player/musicUrlState'
import { appSetting } from '@renderer/store/setting'

const PRELOAD_VERIFY_TIMEOUT = 10_000
const PRELOAD_VERIFY_MIN_PROGRESS = 0.15
const PRELOAD_VERIFY_MIN_PLAY_TIME = 800

let audio: HTMLAudioElement
let currentPreloadTask: ReturnType<typeof createGetMusicUrlTask> | null = null
let activePreloadRequestId = ''
let stopAudioCheck = () => {}
const isActivePreloadRequest = (requestId: string) => activePreloadRequestId === requestId

const initAudio = () => {
  if (audio) return
  audio = new Audio()
  audio.controls = false
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'
  audio.muted = true
  audio.volume = 0
  audio.autoplay = false
}
const cancelPreloadTask = () => {
  activePreloadRequestId = ''
  currentPreloadTask?.cancel()
  currentPreloadTask = null
  stopAudioCheck()
}
const checkMusicUrl = async(url: string, requestId: string): Promise<boolean> => {
  initAudio()
  return new Promise((resolve) => {
    let isSettled = false
    let timeoutId: NodeJS.Timeout | null = null
    let playingStartedAt = 0
    let hasStartedPlayback = false
    let cancelCheck = () => {}

    const cleanup = () => {
      audio.removeEventListener('canplay', handleCanplay)
      audio.removeEventListener('error', handleErr)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('timeupdate', handleTimeupdate)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      if (stopAudioCheck === cancelCheck) stopAudioCheck = () => {}
    }
    const settle = (result: boolean) => {
      if (isSettled) return
      isSettled = true
      cleanup()
      resolve(result)
    }
    const ensureActiveRequest = () => {
      if (activePreloadRequestId === requestId) return true
      settle(false)
      return false
    }
    const verifyPlayback = () => {
      if (!ensureActiveRequest()) return
      if (audio.currentTime >= PRELOAD_VERIFY_MIN_PROGRESS) {
        settle(true)
        return
      }
      if (playingStartedAt && audio.currentTime > 0 && Date.now() - playingStartedAt >= PRELOAD_VERIFY_MIN_PLAY_TIME) settle(true)
    }
    const startPlayback = () => {
      if (!ensureActiveRequest()) return
      if (hasStartedPlayback) return
      hasStartedPlayback = true
      const playPromise = audio.play()
      if (typeof playPromise?.catch == 'function') {
        playPromise.catch(() => {
          settle(false)
        })
      }
    }
    const handleErr = () => {
      settle(false)
    }
    const handleCanplay = () => {
      startPlayback()
    }
    const handlePlaying = () => {
      if (!ensureActiveRequest()) return
      playingStartedAt ||= Date.now()
      verifyPlayback()
    }
    const handleTimeupdate = () => {
      if (!ensureActiveRequest()) return
      if (!playingStartedAt && audio.currentTime > 0) playingStartedAt = Date.now()
      verifyPlayback()
    }

    cancelCheck = () => {
      settle(false)
    }
    stopAudioCheck = cancelCheck
    audio.addEventListener('canplay', handleCanplay)
    audio.addEventListener('error', handleErr)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('timeupdate', handleTimeupdate)
    timeoutId = setTimeout(() => {
      settle(false)
    }, PRELOAD_VERIFY_TIMEOUT)
    audio.src = url
    audio.load()
    startPlayback()
  })
}
const requestPreloadUrl = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh: boolean, requestId: string) => {
  if (!isActivePreloadRequest(requestId)) return ''
  const task = createGetMusicUrlTask({
    musicInfo,
    isRefresh,
    // Preload only needs one strict real-play validation below.
    taskOptions: getPlaybackMusicUrlTaskOptions({ skipUserApiVerify: true }),
  })
  currentPreloadTask = task
  try {
    const url = await task.promise
    return activePreloadRequestId === requestId ? url : ''
  } finally {
    if (currentPreloadTask === task) currentPreloadTask = null
  }
}

const preloadMusicInfo = {
  isLoading: false,
  preProgress: 0,
  info: null as LX.Player.PlayMusicInfo | null,
}
const resetPreloadInfo = () => {
  cancelPreloadTask()
  preloadMusicInfo.preProgress = 0
  preloadMusicInfo.info = null
  preloadMusicInfo.isLoading = false
}
const preloadNextMusicUrl = async(curTime: number) => {
  if (preloadMusicInfo.isLoading || curTime - preloadMusicInfo.preProgress < 3) return
  preloadMusicInfo.isLoading = true
  preloadMusicInfo.preProgress = curTime
  console.log('preload next music url')
  const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  activePreloadRequestId = requestId
  try {
    const info = await getNextPlayMusicInfo()
    if (!info || !isActivePreloadRequest(requestId)) return

    let hasPreloadedUrl = false
    preloadMusicInfo.info = info
    try {
      let url = await requestPreloadUrl(info.musicInfo, false, requestId).catch(() => '')
      if (!isActivePreloadRequest(requestId)) return
      if (url) {
        console.log('preload url', url)
        let result = await checkMusicUrl(url, requestId)
        if (!isActivePreloadRequest(requestId)) return
        if (!result) {
          if (!isActivePreloadRequest(requestId)) return
          url = await requestPreloadUrl(info.musicInfo, true, requestId).catch(() => '')
          if (!isActivePreloadRequest(requestId)) return
          result = url ? await checkMusicUrl(url, requestId) : false
          if (!isActivePreloadRequest(requestId)) return
          console.log('preload url refresh', url)
        }
        if (result && url && activePreloadRequestId === requestId) {
          savePreloadedMusicUrl(info.musicInfo, url)
          hasPreloadedUrl = true
        }
      }
    } finally {
      if (!hasPreloadedUrl && preloadMusicInfo.info === info) preloadMusicInfo.info = null
    }
  } finally {
    if (activePreloadRequestId === requestId) activePreloadRequestId = ''
    preloadMusicInfo.isLoading = false
  }
}

export default () => {
  const setProgress = (time: number) => {
    if (!musicInfo.id) return
    preloadMusicInfo.preProgress = time
  }

  const handleSetPlayInfo = () => {
    resetPreloadInfo()
  }
  const handleStop = () => {
    resetPreloadInfo()
  }

  watch(() => appSetting['player.togglePlayMethod'], () => {
    if (!preloadMusicInfo.info || preloadMusicInfo.info.isTempPlay) return
    resetRandomNextMusicInfo()
    cancelPreloadTask()
    preloadMusicInfo.isLoading = false
    preloadMusicInfo.info = null
    preloadMusicInfo.preProgress = playProgress.nowPlayTime
  })
  watch(() => appSetting['common.apiSource'], () => {
    cancelPreloadTask()
    preloadMusicInfo.isLoading = false
    preloadMusicInfo.info = null
    preloadMusicInfo.preProgress = 0
  })

  window.app_event.on('setProgress', setProgress)
  window.app_event.on('musicToggled', handleSetPlayInfo)
  window.app_event.on('stop', handleStop)

  const rOnTimeupdate = onTimeupdate(() => {
    const time = getCurrentTime()
    const duration = playProgress.maxPlayTime
    if (duration > 10 && duration - time < 10 && !preloadMusicInfo.info) {
      void preloadNextMusicUrl(time)
    }
  })


  onBeforeUnmount(() => {
    resetPreloadInfo()
    rOnTimeupdate()
    window.app_event.off('setProgress', setProgress)
    window.app_event.off('musicToggled', handleSetPlayInfo)
    window.app_event.off('stop', handleStop)
  })
}
