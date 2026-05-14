import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { onTimeupdate, getCurrentTime } from '@renderer/plugins/player'
import { playProgress } from '@renderer/store/player/playProgress'
import { musicInfo } from '@renderer/store/player/state'
// import { getList } from '@renderer/store/utils'
import { getNextPlayMusicInfo, resetRandomNextMusicInfo } from '@renderer/core/player'
import { getPlaybackMusicUrlTaskOptions } from '@renderer/core/player/utils'
import { createGetMusicUrlTask } from '@renderer/core/music'
import { createPlaybackVerifyTask } from '@renderer/core/music/utils'
import { savePreloadedMusicUrl } from '@renderer/core/player/musicUrlState'
import { clearRuntimeSourceMemory, getPreferredResolvedSourceMusicInfo } from '@renderer/core/player/runtimeSourceMemory'
import { appSetting } from '@renderer/store/setting'
import { buildSavePath } from '@renderer/store/download/utils'
import { getDownloadFilePath, getLocalFilePath } from '@renderer/utils/music'

let currentPreloadTask: ReturnType<typeof createGetMusicUrlTask> | null = null
let activePreloadRequestId = ''
let stopAudioCheck = () => {}
const isActivePreloadRequest = (requestId: string) => activePreloadRequestId === requestId

const cancelPreloadTask = () => {
  activePreloadRequestId = ''
  currentPreloadTask?.cancel()
  currentPreloadTask = null
  stopAudioCheck()
}
const checkMusicUrl = async(url: string, requestId: string): Promise<boolean> => {
  if (!isActivePreloadRequest(requestId)) return false
  const verifyTask = createPlaybackVerifyTask(url)
  const cancelCheck = () => {
    verifyTask.cancel()
  }
  stopAudioCheck = cancelCheck
  try {
    await verifyTask.promise
    return isActivePreloadRequest(requestId)
  } catch {
    return false
  } finally {
    if (stopAudioCheck === cancelCheck) stopAudioCheck = () => {}
  }
}
const requestPreloadUrl = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh: boolean, requestId: string) => {
  if (!isActivePreloadRequest(requestId)) return { url: '', resolvedMusicInfo: null as LX.Music.MusicInfo | LX.Download.ListItem | null }
  let resolvedMusicInfo: LX.Music.MusicInfo | LX.Download.ListItem | null = null
  const task = createGetMusicUrlTask({
    musicInfo,
    isRefresh,
    onResolvedMusicInfo(targetResolvedMusicInfo) {
      resolvedMusicInfo = targetResolvedMusicInfo
    },
    // Preload reuses the same verify task as playback below.
    taskOptions: getPlaybackMusicUrlTaskOptions({ skipUserApiVerify: true }),
  })
  currentPreloadTask = task
  try {
    const url = await task.promise
    return activePreloadRequestId === requestId
      ? {
          url,
          resolvedMusicInfo: resolvedMusicInfo ?? getPreferredResolvedSourceMusicInfo(musicInfo),
        }
      : { url: '', resolvedMusicInfo: null }
  } finally {
    if (currentPreloadTask === task) currentPreloadTask = null
  }
}
const shouldRetryPreloadWithRefresh = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  if ('progress' in musicInfo) {
    return !(await getDownloadFilePath(musicInfo, buildSavePath(musicInfo)))
  }
  if (musicInfo.source == 'local') {
    return !(await getLocalFilePath(musicInfo))
  }
  return true
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
      let preloadResult = await requestPreloadUrl(info.musicInfo, false, requestId).catch(() => ({ url: '', resolvedMusicInfo: null }))
      if (!isActivePreloadRequest(requestId)) return
      if (preloadResult.url) {
        let { url, resolvedMusicInfo } = preloadResult
        console.log('preload url', url)
        let result = await checkMusicUrl(url, requestId)
        if (!isActivePreloadRequest(requestId)) return
        if (!result) {
          const canRetryWithRefresh = await shouldRetryPreloadWithRefresh(info.musicInfo)
          if (!isActivePreloadRequest(requestId)) return
          if (canRetryWithRefresh) {
            preloadResult = await requestPreloadUrl(info.musicInfo, true, requestId).catch(() => ({ url: '', resolvedMusicInfo: null }))
            if (!isActivePreloadRequest(requestId)) return
            url = preloadResult.url
            resolvedMusicInfo = preloadResult.resolvedMusicInfo
            result = url ? await checkMusicUrl(url, requestId) : false
            if (!isActivePreloadRequest(requestId)) return
            console.log('preload url refresh', url)
          }
        }
        if (result && url && activePreloadRequestId === requestId) {
          savePreloadedMusicUrl(info.musicInfo, url, resolvedMusicInfo)
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
    clearRuntimeSourceMemory()
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
