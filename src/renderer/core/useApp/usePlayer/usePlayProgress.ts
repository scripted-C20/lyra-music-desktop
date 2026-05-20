import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { formatPlayTime2 } from '@common/utils/common'
import { throttle } from '@common/utils'
import { savePlayInfo } from '@renderer/utils/ipc'
import { onTimeupdate, getCurrentTime, getDuration, setCurrentTime, onVisibilityChange } from '@renderer/plugins/player'
import { playProgress, setNowPlayTime, setMaxplayTime } from '@renderer/store/player/playProgress'
import { musicInfo, playMusicInfo, playInfo } from '@renderer/store/player/state'
// import { getList } from '@renderer/store/utils'
import { appSetting } from '@renderer/store/setting'
import { playNextAfterError, retryCurrentMusicUrlAfterPlaybackFailure, retryCurrentMusicUrlAfterStalledPlayback } from '@renderer/core/player'
import { isPlaybackWindowBackgrounded } from '@renderer/core/player/utils'
import { updateListMusics } from '@renderer/store/list/action'

const delaySavePlayInfo = throttle(savePlayInfo, 2000)
const BUFFERING_STALL_RECOVERY_DELAY = 6_000
const BUFFERING_PROGRESS_THRESHOLD = 0.35

export default () => {
  let restorePlayTime = 0
  let hasPlayedCurrentMusic = false
  let hasTriggeredWaitingRecovery = false
  const clampToDuration = (time: number, duration = getDuration()) => {
    if (!Number.isFinite(time) || time <= 0) return 0
    if (!Number.isFinite(duration) || duration <= 0) return time
    return Math.min(time, duration)
  }
  const mediaBuffer: {
    timeout: NodeJS.Timeout | null
    playTime: number
  } = {
    timeout: null,
    playTime: 0,
  }

  // const updateMusicInfo = useCommit('list', 'updateMusicInfo')

  const createSavedPlayInfo = (time = playProgress.nowPlayTime, maxTime = playProgress.maxPlayTime): LX.Player.SavedPlayInfo | null => {
    if (playMusicInfo.isTempPlay || !playMusicInfo.listId || playInfo.playIndex < 0) return null
    return {
      time: appSetting['player.isSavePlayTime'] ? time : 0,
      maxTime,
      listId: playMusicInfo.listId,
      index: playInfo.playIndex,
    }
  }

  const queueSaveCurrentPlayInfo = (time = playProgress.nowPlayTime, maxTime = playProgress.maxPlayTime) => {
    const info = createSavedPlayInfo(time, maxTime)
    if (!info) return
    delaySavePlayInfo(info)
  }

  const saveCurrentPlayInfoImmediately = () => {
    const currentTime = getCurrentTime()
    const duration = getDuration()
    const info = createSavedPlayInfo(
      Number.isFinite(currentTime) ? currentTime : playProgress.nowPlayTime,
      Number.isFinite(duration) && duration > 0 ? duration : playProgress.maxPlayTime,
    )
    if (!info) return
    savePlayInfo(info)
  }

  const startBuffering = () => {
    console.log('start t')
    if (mediaBuffer.timeout) return
    if (!hasPlayedCurrentMusic) return
    mediaBuffer.playTime = clampToDuration(getCurrentTime(), playProgress.maxPlayTime || getDuration())
    mediaBuffer.timeout = setTimeout(() => {
      mediaBuffer.timeout = null
      if (window.lx.isPlayedStop) return
      const currentTime = getCurrentTime()
      if (isPlaybackWindowBackgrounded()) {
        mediaBuffer.playTime = clampToDuration(currentTime, playProgress.maxPlayTime || getDuration())
        startBuffering()
        return
      }
      if (currentTime > mediaBuffer.playTime + BUFFERING_PROGRESS_THRESHOLD) {
        mediaBuffer.playTime = 0
        return
      }
      mediaBuffer.playTime = 0
      if (!appSetting['player.autoSkipOnError']) return

      restorePlayTime ||= clampToDuration(currentTime, playProgress.maxPlayTime || getDuration())
      hasPlayedCurrentMusic = false

      if (!hasTriggeredWaitingRecovery) {
        hasTriggeredWaitingRecovery = true
        if (retryCurrentMusicUrlAfterStalledPlayback()) return
      }
      if (retryCurrentMusicUrlAfterPlaybackFailure()) return
      void playNextAfterError()
    }, BUFFERING_STALL_RECOVERY_DELAY)
  }
  const clearBufferTimeout = () => {
    console.log('clear t')
    if (!mediaBuffer.timeout) return
    clearTimeout(mediaBuffer.timeout)
    mediaBuffer.timeout = null
    mediaBuffer.playTime = 0
  }

  const setProgress = (time: number, maxTime?: number) => {
    if (!musicInfo.id) return
    if (maxTime != null) setMaxplayTime(maxTime)
    const nextTime = clampToDuration(time, maxTime ?? playProgress.maxPlayTime)
    console.log('setProgress', time, maxTime)
    if (nextTime > 0) restorePlayTime = nextTime
    if (mediaBuffer.playTime) {
      clearBufferTimeout()
      mediaBuffer.playTime = nextTime
      startBuffering()
    }
    setNowPlayTime(nextTime)
    setCurrentTime(nextTime)

    // if (!isPlay) audio.play()
  }

  const handlePause = () => {
    clearBufferTimeout()
  }

  const handleStop = () => {
    hasPlayedCurrentMusic = false
    hasTriggeredWaitingRecovery = false
    clearBufferTimeout()
    setNowPlayTime(0)
    setMaxplayTime(0)
  }

  const handleError = () => {
    restorePlayTime ||= getCurrentTime() // 记录出错的播放时间
    hasPlayedCurrentMusic = false
    console.log('handleError')
  }

  const handleLoadeddata = () => {
    const duration = getDuration()
    setMaxplayTime(duration)
    const currentTime = clampToDuration(getCurrentTime(), duration)
    if (currentTime !== getCurrentTime()) setCurrentTime(currentTime)
    setNowPlayTime(currentTime)
    restorePlayTime = clampToDuration(restorePlayTime, duration)
    mediaBuffer.playTime = clampToDuration(mediaBuffer.playTime, duration)

    if (playMusicInfo.musicInfo && 'source' in playMusicInfo.musicInfo && !playMusicInfo.musicInfo.interval) {
      // console.log(formatPlayTime2(playProgress.maxPlayTime))

      if (playMusicInfo.listId) {
        void updateListMusics([{
          id: playMusicInfo.listId,
          musicInfo: {
            ...playMusicInfo.musicInfo,
            interval: formatPlayTime2(playProgress.maxPlayTime),
          },
        }])
      }
    }
  }

  const handlePlaying = () => {
    console.log('handlePlaying', mediaBuffer.playTime, restorePlayTime)
    hasPlayedCurrentMusic = true
    hasTriggeredWaitingRecovery = false
    clearBufferTimeout()
    if (mediaBuffer.playTime) {
      let playTime = clampToDuration(mediaBuffer.playTime)
      mediaBuffer.playTime = 0
      setCurrentTime(playTime)
    } else if (restorePlayTime) {
      setCurrentTime(clampToDuration(restorePlayTime))
      restorePlayTime = 0
    }
  }
  const handleWating = () => {
    if (!hasPlayedCurrentMusic) return
    startBuffering()
  }

  const handleEmpied = () => {
    hasPlayedCurrentMusic = false
    mediaBuffer.playTime = 0
    clearBufferTimeout()
  }

  const handleSetPlayInfo = () => {
    hasPlayedCurrentMusic = false
    hasTriggeredWaitingRecovery = false
    // restorePlayTime = playProgress.nowPlayTime
    setCurrentTime(restorePlayTime = playProgress.nowPlayTime)
    // setMaxplayTime(playProgress.maxPlayTime)
    handlePause()
    queueSaveCurrentPlayInfo()
  }

  watch(() => playProgress.nowPlayTime, (newValue, oldValue) => {
    if (Math.abs(newValue - oldValue) > 2) window.app_event.activePlayProgressTransition()
    if (appSetting['player.isSavePlayTime']) queueSaveCurrentPlayInfo(newValue, playProgress.maxPlayTime)
  })
  watch(() => playProgress.maxPlayTime, maxPlayTime => {
    queueSaveCurrentPlayInfo(playProgress.nowPlayTime, maxPlayTime)
  })

  // window.app_event.on('play', handlePlay)
  window.app_event.on('pause', handlePause)
  window.app_event.on('stop', handleStop)
  window.app_event.on('error', handleError)
  window.app_event.on('setProgress', setProgress)
  // window.app_event.on(eventPlayerNames.restorePlay, handleRestorePlay)
  window.app_event.on('playerLoadeddata', handleLoadeddata)
  window.app_event.on('playerPlaying', handlePlaying)
  window.app_event.on('playerWaiting', handleWating)
  window.app_event.on('playerEmptied', handleEmpied)
  window.app_event.on('musicToggled', handleSetPlayInfo)

  const rOnTimeupdate = onTimeupdate(() => {
    setNowPlayTime(getCurrentTime())
  })

  let currentPlayTime = 0
  const rVisibilityChange = onVisibilityChange(() => {
    if (document.hidden) {
      currentPlayTime = playProgress.nowPlayTime
    } else {
      if (Math.abs(playProgress.nowPlayTime - currentPlayTime) > 2) {
        window.app_event.activePlayProgressTransition()
      }
    }
  })

  window.addEventListener('beforeunload', saveCurrentPlayInfoImmediately)

  onBeforeUnmount(() => {
    saveCurrentPlayInfoImmediately()
    window.removeEventListener('beforeunload', saveCurrentPlayInfoImmediately)
    rOnTimeupdate()
    rVisibilityChange()
    // window.app_event.off('play', handlePlay)
    window.app_event.off('pause', handlePause)
    window.app_event.off('stop', handleStop)
    window.app_event.off('error', handleError)
    window.app_event.off('setProgress', setProgress)
    // window.app_event.off(eventPlayerNames.restorePlay, handleRestorePlay)
    window.app_event.off('playerLoadeddata', handleLoadeddata)
    window.app_event.off('playerPlaying', handlePlaying)
    window.app_event.off('playerWaiting', handleWating)
    window.app_event.off('playerEmptied', handleEmpied)
    window.app_event.off('musicToggled', handleSetPlayInfo)
  })
}
