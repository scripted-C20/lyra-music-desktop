import { isEmpty, setPause, setPlay, setResource, setStop } from '@renderer/plugins/player'
import { isPlay, isPlayLoading, playedList, playInfo, playMusicInfo, tempPlayList, musicInfo as _musicInfo } from '@renderer/store/player/state'
import {
  getList,
  clearPlayedList,
  clearTempPlayeList,
  setPlayMusicInfo,
  setPlayLoading,
  addPlayedList,
  setMusicInfo,
  setAllStatus,
  removeTempPlayList,
  setPlayListId,
  removePlayedList,
} from '@renderer/store/player/action'
import { appSetting } from '@renderer/store/setting'
import { createGetMusicUrlTask, getPicPath, getLyricInfo } from '../music/index'
import { filterList, getPlaybackMusicUrlTaskOptions } from './utils'
import { requestMsg } from '@renderer/utils/message'
import { getRandom } from '@renderer/utils/index'
import { addListMusics, removeListMusics } from '@renderer/store/list/action'
import { loveList } from '@renderer/store/list/state'
import { addDislikeInfo } from '@renderer/core/dislikeList'
import {
  clearPendingResolvedMusicInfo,
  createMusicUrlRequestId,
  setPendingResolvedMusicInfo,
  takePendingResolvedMusicInfo,
  takePreloadedMusicUrl,
} from './musicUrlState'
import { getPreferredResolvedSourceMusicInfo, setRuntimeSourceMemory } from './runtimeSourceMemory'
// import { checkMusicFileAvailable } from '@renderer/utils/music'

let gettingUrlId = ''
let gettingUrlToken = ''
let gettingUrlTokenSeed = 0
let currentMusicLyricRequestToken = ''
let currentMusicLyricRequestTokenSeed = 0
const createGettingUrlId = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => createMusicUrlRequestId(musicInfo)
const createGettingUrlToken = () => `${Date.now()}_${++gettingUrlTokenSeed}`
const createCurrentMusicLyricRequestToken = () => `${Date.now()}_${++currentMusicLyricRequestTokenSeed}`
const getCurrentPlayingRequestId = () => playMusicInfo.musicInfo ? createGettingUrlId(playMusicInfo.musicInfo) : ''
const clearCurrentMusicLyricRequest = () => {
  currentMusicLyricRequestToken = ''
}
const resetGettingUrlRequestState = () => {
  gettingUrlId = ''
  gettingUrlToken = ''
}
const isSameMusicUrlTask = (curMusicInfo: LX.Music.MusicInfo | LX.Download.ListItem, requestId = createGettingUrlId(curMusicInfo)) => {
  return gettingUrlId == requestId && requestId == getCurrentPlayingRequestId()
}
const isCurrentMusicUrlRequest = (
  curMusicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  requestId = createGettingUrlId(curMusicInfo),
  requestToken = gettingUrlToken,
) => {
  return gettingUrlToken == requestToken && isSameMusicUrlTask(curMusicInfo, requestId)
}
const isSameOnlineMusicInfo = (
  sourceMusicInfo?: Pick<LX.Music.MusicInfoOnline, 'source' | 'id'> | null,
  targetMusicInfo?: Pick<LX.Music.MusicInfoOnline, 'source' | 'id'> | null,
) => {
  return !!sourceMusicInfo && !!targetMusicInfo &&
    sourceMusicInfo.source == targetMusicInfo.source &&
    sourceMusicInfo.id == targetMusicInfo.id
}
const createDelayNextTimeout = (delay: number) => {
  let timeout: NodeJS.Timeout | null
  const clearDelayNextTimeout = () => {
    // console.log(this.timeout)
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  const addDelayNextTimeout = () => {
    clearDelayNextTimeout()
    timeout = setTimeout(() => {
      timeout = null
      if (window.lx.isPlayedStop) return
      console.warn('delay next timeout timeout', delay)
      void playNextAfterError()
    }, delay)
  }

  return {
    clearDelayNextTimeout,
    addDelayNextTimeout,
  }
}
const { clearDelayNextTimeout } = createDelayNextTimeout(5000)
const { addDelayNextTimeout: addLoadTimeout, clearDelayNextTimeout: clearLoadTimeout } = createDelayNextTimeout(100000)
export const URL_FETCH_ERROR_CODE = -1

/**
 * 检查音乐信息是否已更改
 */
const diffCurrentMusicInfo = (
  curMusicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  requestId = createGettingUrlId(curMusicInfo),
  requestToken = gettingUrlToken,
): boolean => !isCurrentMusicUrlRequest(curMusicInfo, requestId, requestToken)

let cancelDelayRetry: (() => void) | null = null
let currentMusicUrlTask: null | { cancel: () => void } = null
const currentMusicUrlState = {
  requestId: '',
  usedPreloadedUrl: false,
  retryWithRefreshOnFailure: true,
}
const resetCurrentMusicUrlState = () => {
  currentMusicUrlState.requestId = ''
  currentMusicUrlState.usedPreloadedUrl = false
  currentMusicUrlState.retryWithRefreshOnFailure = true
}
const shouldRetryPreloadedUrlWithRefresh = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  return !('progress' in musicInfo) && musicInfo.source != 'local'
}
const updateCurrentMusicUrlState = (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  usedPreloadedUrl: boolean,
  retryWithRefreshOnFailure = true,
) => {
  currentMusicUrlState.requestId = createGettingUrlId(musicInfo)
  currentMusicUrlState.usedPreloadedUrl = usedPreloadedUrl
  currentMusicUrlState.retryWithRefreshOnFailure = retryWithRefreshOnFailure
}
export const hasPendingPlayTask = () => !!gettingUrlToken || !!currentMusicUrlTask || !!cancelDelayRetry
const cancelCurrentMusicUrlTask = () => {
  resetGettingUrlRequestState()
  resetCurrentMusicUrlState()
  clearPendingResolvedMusicInfo()
  currentMusicUrlTask?.cancel()
  currentMusicUrlTask = null
}
const RETRYABLE_ERROR_MESSAGES = new Set([
  requestMsg.timeout,
  requestMsg.notConnectNetwork,
  requestMsg.unachievable,
  requestMsg.fail,
])
const delayRetry = async(
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  isRefresh = false,
  requestId = createGettingUrlId(musicInfo),
  requestToken = gettingUrlToken,
): Promise<string | null> => {
  // if (cancelDelayRetry) cancelDelayRetry()
  return new Promise<string | null>((resolve, reject) => {
    const time = getRandom(2, 6)
    setAllStatus(window.i18n.t('player__getting_url_delay_retry', { time }))
    const tiemout = setTimeout(() => {
      getMusicPlayUrl(musicInfo, isRefresh, true, requestId, requestToken).then((result) => {
        cancelDelayRetry = null
        resolve(result)
      }).catch(async(err: any) => {
        cancelDelayRetry = null
        reject(err)
      })
    }, time * 1000)
    cancelDelayRetry = () => {
      clearTimeout(tiemout)
      cancelDelayRetry = null
      resolve(null)
    }
  })
}
const getMusicPlayUrl = async(
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  isRefresh = false,
  isRetryed = false,
  requestId = createGettingUrlId(musicInfo),
  requestToken = gettingUrlToken,
): Promise<string | null> => {
  // this.musicInfo.url = await getMusicPlayUrl(targetSong, type)
  setPlayLoading(true)
  setAllStatus(window.i18n.t('player__getting_url'))
  if (appSetting['player.autoSkipOnError']) addLoadTimeout()
  updateCurrentMusicUrlState(musicInfo, false)

  if (!isRefresh) {
    const { url: preloadedUrl, resolvedMusicInfo } = takePreloadedMusicUrl(musicInfo)
    if (preloadedUrl) {
      updateCurrentMusicUrlState(musicInfo, true, shouldRetryPreloadedUrlWithRefresh(musicInfo))
      if (resolvedMusicInfo) setPendingResolvedMusicInfo(musicInfo, resolvedMusicInfo)
      if (window.lx.isPlayedStop || diffCurrentMusicInfo(musicInfo, requestId, requestToken)) return null
      return preloadedUrl
    }
  }

  // const type = getPlayType(appSetting['player.highQuality'], musicInfo)
  const handleResolvedMusicInfo = (resolvedMusicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
    if (window.lx.isPlayedStop || diffCurrentMusicInfo(musicInfo, requestId, requestToken)) return
    setPendingResolvedMusicInfo(musicInfo, resolvedMusicInfo)
  }
  let toggleMusicInfo = getPreferredResolvedSourceMusicInfo(musicInfo)
  const taskOptions = getPlaybackMusicUrlTaskOptions()

  let fallbackTask: ReturnType<typeof createGetMusicUrlTask> | null = null
  const targetTask = toggleMusicInfo
    ? createGetMusicUrlTask({
      musicInfo: toggleMusicInfo,
      isRefresh,
      allowToggleSource: false,
      onResolvedMusicInfo: handleResolvedMusicInfo,
      taskOptions,
    })
    : null
  const getFallbackTask = () => {
    if (fallbackTask) return fallbackTask
    fallbackTask = createGetMusicUrlTask({
      musicInfo,
      isRefresh,
      taskOptions,
      onResolvedMusicInfo: handleResolvedMusicInfo,
      onToggleSource() {
        if (diffCurrentMusicInfo(musicInfo, requestId)) return
        setAllStatus(window.i18n.t('toggle_source_try'))
      },
    })
    return fallbackTask
  }

  const activeTask = {
    cancel() {
      targetTask?.cancel()
      fallbackTask?.cancel()
    },
  }
  currentMusicUrlTask = activeTask

  const requestPromise = targetTask
    ? targetTask.promise.catch(async(err: any) => {
      if (err.message == requestMsg.cancelRequest) throw err
      return getFallbackTask().promise
    })
    : getFallbackTask().promise

  return requestPromise.then(url => {
    if (window.lx.isPlayedStop || diffCurrentMusicInfo(musicInfo, requestId, requestToken)) return null
    return url
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  }).catch(err => {
    // console.log('err', err.message)
    if (window.lx.isPlayedStop ||
      diffCurrentMusicInfo(musicInfo, requestId, requestToken) ||
      err.message == requestMsg.cancelRequest) return null

    if (err.message == requestMsg.tooManyRequests) return delayRetry(musicInfo, isRefresh, requestId, requestToken)

    if (!isRetryed && RETRYABLE_ERROR_MESSAGES.has(err.message)) return getMusicPlayUrl(musicInfo, isRefresh, true, requestId, requestToken)

    throw err
  }).finally(() => {
    if (currentMusicUrlTask === activeTask) currentMusicUrlTask = null
  })
}

export const setMusicUrl = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh?: boolean) => {
  // if (appSetting['player.autoSkipOnError']) addLoadTimeout()
  const requestId = createGettingUrlId(musicInfo)
  if (!isRefresh && currentMusicUrlTask && isSameMusicUrlTask(musicInfo, requestId)) return
  cancelCurrentMusicUrlTask()
  if (cancelDelayRetry) cancelDelayRetry()
  const requestToken = createGettingUrlToken()
  gettingUrlId = requestId
  gettingUrlToken = requestToken
  void getMusicPlayUrl(musicInfo, isRefresh, false, requestId, requestToken).then((url) => {
    if (!url) return
    setResource(url)
  }).catch((err: any) => {
    console.log(err)
    setAllStatus(err.message)
    if (appSetting['player.autoSkipOnError']) {
      setPlayLoading(true)
    } else {
      setPlayLoading(false)
    }
    window.app_event.error(URL_FETCH_ERROR_CODE)
    window.app_event.playerError(URL_FETCH_ERROR_CODE)
  }).finally(() => {
    if (gettingUrlToken == requestToken) {
      resetGettingUrlRequestState()
      clearLoadTimeout()
    }
  })
}

export const retryCurrentMusicUrlAfterPreloadFailure = (): boolean => {
  if (!playMusicInfo.musicInfo) return false
  if (!currentMusicUrlState.usedPreloadedUrl || currentMusicUrlState.requestId != createGettingUrlId(playMusicInfo.musicInfo)) return false
  const isRefresh = currentMusicUrlState.retryWithRefreshOnFailure
  currentMusicUrlState.usedPreloadedUrl = false
  if (!isEmpty()) setStop()
  setMusicUrl(playMusicInfo.musicInfo, isRefresh)
  return true
}

const shouldRefreshLyricFromResolvedSource = (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  resolvedMusicInfo: LX.Music.MusicInfoOnline,
) => {
  const baseMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  return baseMusicInfo.source == 'local' ||
    baseMusicInfo.source != resolvedMusicInfo.source ||
    baseMusicInfo.id != resolvedMusicInfo.id
}

const refreshCurrentMusicLyric = (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  resolvedMusicInfo: LX.Music.MusicInfoOnline,
  requestId = createGettingUrlId(musicInfo),
) => {
  requestCurrentMusicLyric(musicInfo, {
    requestId,
    expectedResolvedMusicInfo: resolvedMusicInfo,
    suppressLoadErrorStatus: true,
  })
}

const requestCurrentMusicLyric = (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  options: {
    requestId?: string
    expectedResolvedMusicInfo?: LX.Music.MusicInfoOnline | null
    suppressLoadErrorStatus?: boolean
  } = {},
) => {
  const requestToken = createCurrentMusicLyricRequestToken()
  currentMusicLyricRequestToken = requestToken
  void getLyricInfo({ musicInfo }).then((lyricInfo) => {
    if (currentMusicLyricRequestToken != requestToken) return
    if ((options.requestId ?? createGettingUrlId(musicInfo)) != createGettingUrlId(playMusicInfo.musicInfo ?? musicInfo)) return
    if (musicInfo.id != playMusicInfo.musicInfo?.id) return
    if (options.expectedResolvedMusicInfo) {
      const currentResolvedMusicInfo = getPreferredResolvedSourceMusicInfo(playMusicInfo.musicInfo)
      if (!isSameOnlineMusicInfo(currentResolvedMusicInfo, options.expectedResolvedMusicInfo)) return
    }
    setMusicInfo({
      lrc: lyricInfo.lyric,
      tlrc: lyricInfo.tlyric,
      lxlrc: lyricInfo.lxlyric,
      rlrc: lyricInfo.rlyric,
      rawlrc: lyricInfo.rawlrcInfo.lyric,
    })
    window.app_event.lyricUpdated()
  }).catch((err) => {
    console.log(err)
    if (currentMusicLyricRequestToken != requestToken) return
    if ((options.requestId ?? createGettingUrlId(musicInfo)) != createGettingUrlId(playMusicInfo.musicInfo ?? musicInfo)) return
    if (musicInfo.id != playMusicInfo.musicInfo?.id) return
    if (options.expectedResolvedMusicInfo) {
      const currentResolvedMusicInfo = getPreferredResolvedSourceMusicInfo(playMusicInfo.musicInfo)
      if (!isSameOnlineMusicInfo(currentResolvedMusicInfo, options.expectedResolvedMusicInfo)) return
    }
    if (options.suppressLoadErrorStatus) return
    setAllStatus(window.i18n.t('lyric__load_error'))
  })
}

export const markCurrentMusicUrlPlaybackStarted = () => {
  if (!playMusicInfo.musicInfo) return null
  if (currentMusicUrlState.requestId != createGettingUrlId(playMusicInfo.musicInfo)) return null
  currentMusicUrlState.usedPreloadedUrl = false
  const resolvedMusicInfo = takePendingResolvedMusicInfo(playMusicInfo.musicInfo)
  if (!resolvedMusicInfo) return null
  setRuntimeSourceMemory(playMusicInfo.musicInfo, resolvedMusicInfo)
  if (shouldRefreshLyricFromResolvedSource(playMusicInfo.musicInfo, resolvedMusicInfo)) {
    refreshCurrentMusicLyric(playMusicInfo.musicInfo, resolvedMusicInfo, currentMusicUrlState.requestId)
  }
  return resolvedMusicInfo
}

// 恢复上次播放的状态
const handleRestorePlay = async(restorePlayInfo: LX.Player.SavedPlayInfo) => {
  const musicInfo = playMusicInfo.musicInfo
  if (!musicInfo) return

  setImmediate(() => {
    if (musicInfo.id != playMusicInfo.musicInfo?.id) return
    window.app_event.setProgress(appSetting['player.isSavePlayTime'] ? restorePlayInfo.time : 0, restorePlayInfo.maxTime)
    window.app_event.pause()
  })


  void getPicPath({ musicInfo, listId: playMusicInfo.listId }).then((url: string) => {
    if (musicInfo.id != playMusicInfo.musicInfo?.id || url == _musicInfo.pic) return
    setMusicInfo({ pic: url })
    window.app_event.picUpdated()
  }).catch(_ => _)

  requestCurrentMusicLyric(musicInfo)

  if (appSetting['player.togglePlayMethod'] == 'random' && !playMusicInfo.isTempPlay) addPlayedList({ ...playMusicInfo as LX.Player.PlayMusicInfo })
}


// 处理音乐播放
const handlePlay = () => {
  window.lx.isPlayedStop &&= false

  resetRandomNextMusicInfo()
  if (window.lx.restorePlayInfo) {
    void handleRestorePlay(window.lx.restorePlayInfo)
    window.lx.restorePlayInfo = null
    return
  }
  const musicInfo = playMusicInfo.musicInfo

  if (!musicInfo) return

  setStop()
  window.app_event.pause()

  clearDelayNextTimeout()
  clearLoadTimeout()


  if (appSetting['player.togglePlayMethod'] == 'random' && !playMusicInfo.isTempPlay) addPlayedList({ ...(playMusicInfo as LX.Player.PlayMusicInfo) })

  setMusicUrl(musicInfo)

  void getPicPath({ musicInfo, listId: playMusicInfo.listId }).then((url: string) => {
    if (musicInfo.id != playMusicInfo.musicInfo?.id || url == _musicInfo.pic) return
    setMusicInfo({ pic: url })
    window.app_event.picUpdated()
  }).catch(_ => _)

  requestCurrentMusicLyric(musicInfo)
}

/**
 * 播放列表内歌曲
 * @param listId 列表id
 * @param id 歌曲id
 */
export const playListById = (listId: string, id: string) => {
  const prevListId = playInfo.playerListId
  setPlayListId(listId)
  // pause()
  const musicInfo = getList(listId).find(m => m.id == id)
  if (!musicInfo) return
  setPlayMusicInfo(listId, musicInfo)
  if (appSetting['player.isAutoCleanPlayedList'] || prevListId != listId) clearPlayedList()
  clearTempPlayeList()
  handlePlay()
}

/**
 * 播放列表内歌曲
 * @param listId 列表id
 * @param index 播放的歌曲位置
 */
export const playList = (listId: string, index: number) => {
  const prevListId = playInfo.playerListId
  setPlayListId(listId)
  // pause()
  setPlayMusicInfo(listId, getList(listId)[index])
  if (appSetting['player.isAutoCleanPlayedList'] || prevListId != listId) clearPlayedList()
  clearTempPlayeList()
  handlePlay()
}

const handleToggleStop = () => {
  clearCurrentMusicLyricRequest()
  cancelCurrentMusicUrlTask()
  if (cancelDelayRetry) cancelDelayRetry()
  stop()
  setTimeout(() => {
    setPlayMusicInfo(null, null)
  })
}

const randomNextMusicInfo = {
  info: null as LX.Player.PlayMusicInfo | null,
  // index: -1,
}
export const resetRandomNextMusicInfo = () => {
  if (randomNextMusicInfo.info) {
    randomNextMusicInfo.info = null
    // randomNextMusicInfo.index = -1
  }
}

const normalizeNextTogglePlayMethod = (
  togglePlayMethod: LX.AppSetting['player.togglePlayMethod'],
  isAutoToggle: boolean,
  isErrorAutoAdvance: boolean,
) => {
  if (isErrorAutoAdvance) {
    switch (togglePlayMethod) {
      case 'singleLoop':
      case 'none':
        return 'list'
      default:
        return togglePlayMethod
    }
  }
  if (!isAutoToggle) {
    switch (togglePlayMethod) {
      case 'list':
      case 'singleLoop':
      case 'none':
        return 'listLoop'
      default:
        return togglePlayMethod
    }
  }
  return togglePlayMethod
}

export const getNextPlayMusicInfo = async(): Promise<LX.Player.PlayMusicInfo | null> => {
  if (tempPlayList.length) { // 如果稍后播放列表存在歌曲则直接播放改列表的歌曲
    const playMusicInfo = tempPlayList[0]
    return playMusicInfo
  }

  if (playMusicInfo.musicInfo == null) return null

  if (randomNextMusicInfo.info) return randomNextMusicInfo.info

  // console.log(playInfo.playerListId)
  const currentListId = playInfo.playerListId
  if (!currentListId) return null
  const currentList = getList(currentListId)

  if (playedList.length) { // 移除已播放列表内不存在原列表的歌曲
    let currentId: string
    if (playMusicInfo.isTempPlay) {
      const musicInfo = currentList[playInfo.playerPlayIndex]
      if (musicInfo) currentId = musicInfo.id
    } else {
      currentId = playMusicInfo.musicInfo.id
    }
    // 从已播放列表移除播放列表已删除的歌曲
    let index
    for (index = playedList.findIndex(m => m.musicInfo.id === currentId) + 1; index < playedList.length; index++) {
      const playMusicInfo = playedList[index]
      const currentId = playMusicInfo.musicInfo.id
      if (playMusicInfo.listId == currentListId && !currentList.some(m => m.id === currentId)) {
        removePlayedList(index)
        continue
      }
      break
    }

    if (index < playedList.length) return playedList[index]
  }
  // const isCheckFile = findNum > 2 // 针对下载列表，如果超过两次都碰到无效歌曲，则过滤整个列表内的无效歌曲
  let { filteredList, playerIndex } = await filterList({ // 过滤已播放歌曲
    listId: currentListId,
    list: currentList,
    playedList,
    playerMusicInfo: currentList[playInfo.playerPlayIndex],
    isNext: true,
  })

  if (!filteredList.length) return null
  // let currentIndex: number = filteredList.indexOf(currentList[playInfo.playerPlayIndex])
  if (playerIndex == -1 && filteredList.length) playerIndex = 0
  let nextIndex = playerIndex

  let togglePlayMethod = appSetting['player.togglePlayMethod']
  switch (togglePlayMethod) {
    case 'listLoop':
      nextIndex = playerIndex === filteredList.length - 1 ? 0 : playerIndex + 1
      break
    case 'random':
      nextIndex = getRandom(0, filteredList.length)
      break
    case 'list':
      nextIndex = playerIndex === filteredList.length - 1 ? -1 : playerIndex + 1
      break
    case 'singleLoop':
      break
    default:
      return null
  }
  if (nextIndex < 0) return null

  const nextPlayMusicInfo = {
    musicInfo: filteredList[nextIndex],
    listId: currentListId,
    isTempPlay: false,
  }

  if (togglePlayMethod == 'random') {
    randomNextMusicInfo.info = nextPlayMusicInfo
    // randomNextMusicInfo.index = nextIndex
  }
  return nextPlayMusicInfo
}

const handlePlayNext = (playMusicInfo: LX.Player.PlayMusicInfo) => {
  // pause()
  setPlayMusicInfo(playMusicInfo.listId, playMusicInfo.musicInfo, playMusicInfo.isTempPlay)
  handlePlay()
}
/**
 * 下一曲
 * @param isAutoToggle 是否自动切换
 * @returns
 */
export const playNext = async(isAutoToggle = false, isErrorAutoAdvance = false): Promise<boolean> => {
  console.log('skip next', isAutoToggle)
  if (tempPlayList.length) { // 如果稍后播放列表存在歌曲则直接播放改列表的歌曲
    const playMusicInfo = tempPlayList[0]
    removeTempPlayList(0)
    handlePlayNext(playMusicInfo)
    console.log('play temp list')
    return true
  }

  if (playMusicInfo.musicInfo == null) {
    handleToggleStop()
    console.log('musicInfo empty')
    return false
  }

  // console.log(playInfo.playerListId)
  const currentListId = playInfo.playerListId
  if (!currentListId) {
    handleToggleStop()
    console.log('currentListId empty')
    return false
  }
  const currentList = getList(currentListId)

  if (playedList.length) { // 移除已播放列表内不存在原列表的歌曲
    let currentId: string
    if (playMusicInfo.isTempPlay) {
      const musicInfo = currentList[playInfo.playerPlayIndex]
      if (musicInfo) currentId = musicInfo.id
    } else {
      currentId = playMusicInfo.musicInfo.id
    }
    // 从已播放列表移除播放列表已删除的歌曲
    let index
    for (index = playedList.findIndex(m => m.musicInfo.id === currentId) + 1; index < playedList.length; index++) {
      const playMusicInfo = playedList[index]
      const currentId = playMusicInfo.musicInfo.id
      if (playMusicInfo.listId == currentListId && !currentList.some(m => m.id === currentId)) {
        removePlayedList(index)
        continue
      }
      break
    }

    if (index < playedList.length) {
      handlePlayNext(playedList[index])
      console.log('play played list')
      return true
    }
  }
  if (randomNextMusicInfo.info) {
    handlePlayNext(randomNextMusicInfo.info)
    return true
  }
  // const isCheckFile = findNum > 2 // 针对下载列表，如果超过两次都碰到无效歌曲，则过滤整个列表内的无效歌曲
  let { filteredList, playerIndex } = await filterList({ // 过滤已播放歌曲
    listId: currentListId,
    list: currentList,
    playedList,
    playerMusicInfo: currentList[playInfo.playerPlayIndex],
    isNext: true,
  })

  if (!filteredList.length) {
    handleToggleStop()
    console.log('filtered list empty')
    return false
  }
  // let currentIndex: number = filteredList.indexOf(currentList[playInfo.playerPlayIndex])
  if (playerIndex == -1 && filteredList.length) playerIndex = 0
  let nextIndex = playerIndex

  let togglePlayMethod = normalizeNextTogglePlayMethod(appSetting['player.togglePlayMethod'], isAutoToggle, isErrorAutoAdvance)
  switch (togglePlayMethod) {
    case 'listLoop':
      nextIndex = playerIndex === filteredList.length - 1 ? 0 : playerIndex + 1
      break
    case 'random':
      nextIndex = getRandom(0, filteredList.length)
      break
    case 'list':
      nextIndex = playerIndex === filteredList.length - 1 ? -1 : playerIndex + 1
      break
    case 'singleLoop':
      break
    default:
      nextIndex = -1
      console.log('stop toggle play', togglePlayMethod, isAutoToggle)
      return false
  }
  if (nextIndex < 0) {
    console.log('next index empty')
    return false
  }

  handlePlayNext({
    musicInfo: filteredList[nextIndex],
    listId: currentListId,
    isTempPlay: false,
  })
  return true
}

export const playNextAfterError = async(): Promise<boolean> => {
  const switched = await playNext(true, true)
  if (!switched && playMusicInfo.musicInfo) stop()
  return switched
}

/**
 * 上一曲
 */
export const playPrev = async(isAutoToggle = false): Promise<void> => {
  if (playMusicInfo.musicInfo == null) {
    handleToggleStop()
    return
  }

  const currentListId = playInfo.playerListId
  if (!currentListId) {
    handleToggleStop()
    return
  }
  const currentList = getList(currentListId)

  if (playedList.length) {
    let currentId: string
    if (playMusicInfo.isTempPlay) {
      const musicInfo = currentList[playInfo.playerPlayIndex]
      if (musicInfo) currentId = musicInfo.id
    } else {
      currentId = playMusicInfo.musicInfo.id
    }
    // 从已播放列表移除播放列表已删除的歌曲
    let index
    for (index = playedList.findIndex(m => m.musicInfo.id === currentId) - 1; index > -1; index--) {
      const playMusicInfo = playedList[index]
      const currentId = playMusicInfo.musicInfo.id
      if (playMusicInfo.listId == currentListId && !currentList.some(m => m.id === currentId)) {
        removePlayedList(index)
        continue
      }
      break
    }

    if (index > -1) {
      handlePlayNext(playedList[index])
      return
    }
  }

  // const isCheckFile = findNum > 2
  let { filteredList, playerIndex } = await filterList({ // 过滤已播放歌曲
    listId: currentListId,
    list: currentList,
    playedList,
    playerMusicInfo: currentList[playInfo.playerPlayIndex],
    isNext: false,
  })
  if (!filteredList.length) {
    handleToggleStop()
    return
  }

  // let currentIndex = filteredList.indexOf(currentList[playInfo.playerPlayIndex])
  if (playerIndex == -1 && filteredList.length) playerIndex = 0
  let nextIndex = playerIndex
  if (!playMusicInfo.isTempPlay) {
    let togglePlayMethod = appSetting['player.togglePlayMethod']
    if (!isAutoToggle) {
      switch (togglePlayMethod) {
        case 'list':
        case 'singleLoop':
        case 'none':
          togglePlayMethod = 'listLoop'
      }
    }
    switch (togglePlayMethod) {
      case 'random':
        nextIndex = getRandom(0, filteredList.length)
        break
      case 'listLoop':
      case 'list':
        nextIndex = playerIndex === 0 ? filteredList.length - 1 : playerIndex - 1
        break
      case 'singleLoop':
        break
      default:
        nextIndex = -1
        return
    }
    if (nextIndex < 0) return
  }

  handlePlayNext({
    musicInfo: filteredList[nextIndex],
    listId: currentListId,
    isTempPlay: false,
  })
}

/**
 * 恢复播放
 */
export const play = () => {
  window.lx.isPlayedStop &&= false
  if (playMusicInfo.musicInfo == null) return
  if (isEmpty()) {
    if (!currentMusicUrlTask || !isSameMusicUrlTask(playMusicInfo.musicInfo)) setMusicUrl(playMusicInfo.musicInfo)
    return
  }
  setPlay()
}

/**
 * 暂停播放
 */
export const pause = () => {
  setPause()
}

/**
 * 停止播放
 */
export const stop = () => {
  clearCurrentMusicLyricRequest()
  cancelCurrentMusicUrlTask()
  if (cancelDelayRetry) cancelDelayRetry()
  setStop()
  setTimeout(() => {
    window.app_event.stop()
  })
}

export const stopPendingPlay = () => {
  window.lx.isPlayedStop = true
  clearCurrentMusicLyricRequest()
  resetGettingUrlRequestState()
  clearDelayNextTimeout()
  clearLoadTimeout()
  cancelCurrentMusicUrlTask()
  if (cancelDelayRetry) cancelDelayRetry()
  setPlayLoading(false)
  setAllStatus('')
  stop()
}

/**
 * 播放、暂停播放切换
 */
export const togglePlay = () => {
  window.lx.isPlayedStop &&= false
  if (isPlayLoading.value && !isPlay.value) {
    stopPendingPlay()
    return
  }
  if (isPlay.value) {
    pause()
  } else {
    play()
  }
}

/**
 * 收藏当前播放的歌曲
 */
export const collectMusic = () => {
  if (!playMusicInfo.musicInfo) return
  void addListMusics(loveList.id, ['progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo : playMusicInfo.musicInfo])
}

/**
 * 取消收藏当前播放的歌曲
 */
export const uncollectMusic = () => {
  if (!playMusicInfo.musicInfo) return
  void removeListMusics({ listId: loveList.id, ids: ['progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo.id : playMusicInfo.musicInfo.id] })
}

/**
 * 不喜欢当前播放的歌曲
 */
export const dislikeMusic = async() => {
  if (!playMusicInfo.musicInfo) return
  const minfo = 'progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo : playMusicInfo.musicInfo
  await addDislikeInfo([{ name: minfo.name, singer: minfo.singer }])
  await playNext(true)
}
