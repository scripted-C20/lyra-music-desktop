import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { getSourceSearchTimeoutWithBufferMs } from '@common/constants'
import { useI18n } from '@renderer/plugins/i18n'
import { isPlay, isPlayLoading, playMusicInfo } from '@renderer/store/player/state'
import { playProgress } from '@renderer/store/player/playProgress'
import { setPause, setResource, setStop, isEmpty, getDuration } from '@renderer/plugins/player'
import { hasPendingPlayTask, markCurrentMusicUrlPlaybackStarted, playNextAfterError, retryCurrentMusicUrlAfterPreloadFailure, setMusicUrl, URL_FETCH_ERROR_CODE } from '@renderer/core/player'
import { createGetMusicUrlTask } from '@renderer/core/music'
import { clearRuntimeSourceMemory } from '@renderer/core/player/runtimeSourceMemory'
import { clearPendingResolvedMusicInfo, createMusicUrlRequestId, setPendingResolvedMusicInfo } from '@renderer/core/player/musicUrlState'
import { getPlaybackMusicUrlTaskOptions } from '@renderer/core/player/utils'
import { setAllStatus, setPlayLoading } from '@renderer/store/player/action'
import { appSetting } from '@renderer/store/setting'
import { getDownloadFilePath, getLocalFilePath } from '@renderer/utils/music'
import { buildSavePath } from '@renderer/store/download/utils'

export default () => {
  const t = useI18n()
  let retryNum = 0
  let prevTimeoutId: string | null = null
  let requestErrorRetryId: string | null = null
  const getCurrentRequestId = () => {
    return playMusicInfo.musicInfo ? createMusicUrlRequestId(playMusicInfo.musicInfo) : ''
  }

  let loadingTimeout: NodeJS.Timeout | null = null
  let delayNextTimeout: NodeJS.Timeout | null = null
  let sourceChangeRefreshTask: ReturnType<typeof createGetMusicUrlTask> | null = null
  let sourceChangeResumeState: null | {
    requestId: string
    progress: number
    maxPlayTime: number
    shouldPause: boolean
  } = null
  const clearSourceChangeResumeState = () => {
    sourceChangeResumeState = null
  }
  const queueSourceChangeResumeState = (requestId: string, progress: number, maxPlayTime: number, shouldPause: boolean) => {
    if (!(progress > 0)) {
      clearSourceChangeResumeState()
      return
    }
    sourceChangeResumeState = {
      requestId,
      progress,
      maxPlayTime,
      shouldPause,
    }
  }
  const restoreSourceChangeResumeState = () => {
    if (!sourceChangeResumeState || window.lx.isPlayedStop || !playMusicInfo.musicInfo) return false
    if (createMusicUrlRequestId(playMusicInfo.musicInfo) !== sourceChangeResumeState.requestId) {
      clearSourceChangeResumeState()
      return false
    }
    const { progress, maxPlayTime, shouldPause } = sourceChangeResumeState
    const duration = getDuration()
    const effectiveMaxPlayTime = Number.isFinite(duration) && duration > 0 ? duration : maxPlayTime
    const nextProgress = effectiveMaxPlayTime > 0 ? Math.min(progress, effectiveMaxPlayTime) : progress
    clearSourceChangeResumeState()
    if (shouldPause) setPause()
    window.app_event.setProgress(nextProgress, effectiveMaxPlayTime)
    return true
  }
  const cancelSourceChangeRefreshTask = () => {
    sourceChangeRefreshTask?.cancel()
    sourceChangeRefreshTask = null
    clearPendingResolvedMusicInfo(playMusicInfo.musicInfo ?? undefined)
    clearSourceChangeResumeState()
  }
  const retryCurrentMusicUrl = () => {
    if (!playMusicInfo.musicInfo) return false
    setPlayLoading(true)
    setAllStatus(t('player__refresh_url'))
    setMusicUrl(playMusicInfo.musicInfo, true)
    return true
  }
  const startLoadingTimeout = () => {
    // console.log('start load timeout')
    clearLoadingTimeout()
    loadingTimeout = setTimeout(() => {
      if (window.lx.isPlayedStop) {
        prevTimeoutId = null
        setAllStatus('')
        return
      }

      if (retryCurrentMusicUrlAfterPreloadFailure()) {
        prevTimeoutId = null
        requestErrorRetryId = null
        setPlayLoading(true)
        setAllStatus(t('player__refresh_url'))
        return
      }

      // 如果加载超时，则尝试刷新URL
      const currentRequestId = getCurrentRequestId()
      if (!currentRequestId) return
      if (prevTimeoutId == currentRequestId) {
        prevTimeoutId = null
        void playNextAfterError()
      } else {
        prevTimeoutId = currentRequestId
        if (playMusicInfo.musicInfo) setMusicUrl(playMusicInfo.musicInfo, true)
      }
    }, getSourceSearchTimeoutWithBufferMs(appSetting['common.sourceSearchTimeout']))
  }
  const clearLoadingTimeout = () => {
    if (!loadingTimeout) return
    // console.log('clear load timeout')
    clearTimeout(loadingTimeout)
    loadingTimeout = null
  }

  const clearDelayNextTimeout = () => {
    // console.log(this.delayNextTimeout)
    if (!delayNextTimeout) return
    clearTimeout(delayNextTimeout)
    delayNextTimeout = null
  }
  const addDelayNextTimeout = () => {
    clearDelayNextTimeout()
    delayNextTimeout = setTimeout(() => {
      if (window.lx.isPlayedStop) {
        setAllStatus('')
        return
      }
      void playNextAfterError()
    }, 5000)
  }

  const handleLoadstart = () => {
    if (window.lx.isPlayedStop) return
    if (appSetting['player.autoSkipOnError']) startLoadingTimeout()
    setPlayLoading(true)
    setAllStatus(t('player__loading'))
  }

  const handleLoadeddata = () => {
    setPlayLoading(true)
    setAllStatus(t('player__loading'))
    restoreSourceChangeResumeState()
  }

  const handleCanplay = () => {
    restoreSourceChangeResumeState()
  }

  const handlePlaying = () => {
    restoreSourceChangeResumeState()
    markCurrentMusicUrlPlaybackStarted()
    requestErrorRetryId = null
    setPlayLoading(false)
    setAllStatus('')
    clearLoadingTimeout()
  }

  const handleEmpied = () => {
    if (hasPendingPlayTask()) {
      setPlayLoading(true)
      return
    }
    setPlayLoading(false)
    clearDelayNextTimeout()
    clearLoadingTimeout()
  }

  const handleWating = () => {
    setPlayLoading(true)
    setAllStatus(t('player__buffering'))
  }

  const handleError = (errCode?: number) => {
    const currentRequestId = getCurrentRequestId()
    if (!currentRequestId) return
    clearLoadingTimeout()
    if (window.lx.isPlayedStop) return
    if (retryCurrentMusicUrlAfterPreloadFailure()) {
      retryNum = 0
      prevTimeoutId = null
      requestErrorRetryId = null
      setPlayLoading(true)
      setAllStatus(t('player__refresh_url'))
      return
    }
    clearPendingResolvedMusicInfo(playMusicInfo.musicInfo ?? undefined)
    if (errCode === URL_FETCH_ERROR_CODE) {
      if (playMusicInfo.musicInfo && requestErrorRetryId !== currentRequestId) {
        requestErrorRetryId = currentRequestId
        if (retryCurrentMusicUrl()) return
      }
      if (appSetting['player.autoSkipOnError']) {
        setPlayLoading(true)
        setAllStatus(t('player__error'))
        addDelayNextTimeout()
      } else {
        setPlayLoading(false)
      }
      return
    }
    if (!isEmpty()) setStop()
    if (playMusicInfo.musicInfo && errCode !== 1 && retryNum < 2) { // 若音频URL无效则尝试刷新2次URL
      // console.log(this.retryNum)
      retryNum++
      requestErrorRetryId = null
      setPlayLoading(true)
      setMusicUrl(playMusicInfo.musicInfo, true)
      setAllStatus(t('player__refresh_url'))
      return
    }

    setPlayLoading(false)

    if (appSetting['player.autoSkipOnError']) {
      setAllStatus(t('player__error'))
      addDelayNextTimeout()
    }
  }

  const handleSetPlayInfo = () => {
    cancelSourceChangeRefreshTask()
    clearSourceChangeResumeState()
    retryNum = 0
    prevTimeoutId = null
    requestErrorRetryId = null
    clearDelayNextTimeout()
    clearLoadingTimeout()
  }
  const handleStop = () => {
    cancelSourceChangeRefreshTask()
    clearSourceChangeResumeState()
    retryNum = 0
    prevTimeoutId = null
    requestErrorRetryId = null
    setPlayLoading(false)
    clearDelayNextTimeout()
    clearLoadingTimeout()
  }
  const shouldRefreshCurrentMusicOnSourceChange = async(musicInfo: LX.Player.PlayMusicInfo['musicInfo']) => {
    if (!musicInfo) return false
    if (!('progress' in musicInfo) && musicInfo.source !== 'local') return true
    if ('progress' in musicInfo) {
      return !(await getDownloadFilePath(musicInfo, buildSavePath(musicInfo)))
    }
    return !(await getLocalFilePath(musicInfo))
  }
  const refreshCurrentMusicOnSourceChange = async() => {
    const currentMusic = playMusicInfo.musicInfo
    if (!currentMusic || window.lx.isPlayedStop) return
    const currentRequestId = createMusicUrlRequestId(currentMusic)
    const shouldRefresh = await shouldRefreshCurrentMusicOnSourceChange(currentMusic)
    if (!shouldRefresh || window.lx.isPlayedStop || !playMusicInfo.musicInfo) return
    if (createMusicUrlRequestId(playMusicInfo.musicInfo) !== currentRequestId) return
    clearRuntimeSourceMemory()
    cancelSourceChangeRefreshTask()
    retryNum = 0
    prevTimeoutId = null
    requestErrorRetryId = null
    clearDelayNextTimeout()
    clearLoadingTimeout()

    const canKeepCurrentPlayback = !isPlayLoading.value && !isEmpty() && playProgress.nowPlayTime > 0
    setPlayLoading(true)
    setAllStatus(t('player__getting_url'))
    if (!canKeepCurrentPlayback) {
      setMusicUrl(playMusicInfo.musicInfo, true)
      return
    }

    const task = createGetMusicUrlTask({
      musicInfo: playMusicInfo.musicInfo,
      isRefresh: true,
      taskOptions: getPlaybackMusicUrlTaskOptions({ skipSharedCache: true }),
      onResolvedMusicInfo(resolvedMusicInfo) {
        setPendingResolvedMusicInfo(currentMusic, resolvedMusicInfo)
      },
    })
    sourceChangeRefreshTask = task
    try {
      const url = await task.promise
      if (sourceChangeRefreshTask !== task) return
      if (!playMusicInfo.musicInfo || window.lx.isPlayedStop) return
      if (createMusicUrlRequestId(playMusicInfo.musicInfo) !== currentRequestId) return
      queueSourceChangeResumeState(
        currentRequestId,
        playProgress.nowPlayTime,
        playProgress.maxPlayTime,
        !isPlay.value,
      )
      setResource(url)
    } catch (err) {
      if (sourceChangeRefreshTask !== task) return
      if (!playMusicInfo.musicInfo || window.lx.isPlayedStop) return
      if (createMusicUrlRequestId(playMusicInfo.musicInfo) !== currentRequestId) return
      console.log(err)
      setPlayLoading(false)
      setAllStatus('')
    } finally {
      if (sourceChangeRefreshTask === task) sourceChangeRefreshTask = null
    }
  }

  watch(() => appSetting['common.apiSource'], (sourceId, prevSourceId) => {
    if (sourceId === prevSourceId) return
    if (!playMusicInfo.musicInfo) return
    if (window.lx.isPlayedStop) return
    void refreshCurrentMusicOnSourceChange()
  })

  // const handlePlayedStop = () => {
  //   clearDelayNextTimeout()
  //   clearLoadingTimeout()
  // }


  window.app_event.on('playerLoadstart', handleLoadstart)
  window.app_event.on('playerLoadeddata', handleLoadeddata)
  window.app_event.on('playerCanplay', handleCanplay)
  window.app_event.on('playerPlaying', handlePlaying)
  window.app_event.on('playerWaiting', handleWating)
  window.app_event.on('playerEmptied', handleEmpied)
  window.app_event.on('playerError', handleError)
  window.app_event.on('stop', handleStop)
  window.app_event.on('musicToggled', handleSetPlayInfo)

  onBeforeUnmount(() => {
    cancelSourceChangeRefreshTask()
    window.app_event.off('playerLoadstart', handleLoadstart)
    window.app_event.off('playerLoadeddata', handleLoadeddata)
    window.app_event.off('playerCanplay', handleCanplay)
    window.app_event.off('playerPlaying', handlePlaying)
    window.app_event.off('playerWaiting', handleWating)
    window.app_event.off('playerEmptied', handleEmpied)
    window.app_event.off('playerError', handleError)
    window.app_event.off('stop', handleStop)
    window.app_event.off('musicToggled', handleSetPlayInfo)
  })
}
