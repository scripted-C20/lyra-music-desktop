import { reactive } from '@common/utils/vueTools'
import { formatPlayTime2 } from '@common/utils/common'

export const playProgress = reactive({
  nowPlayTime: 0,
  maxPlayTime: 0,
  progress: 0,
  nowPlayTimeStr: '00:00',
  maxPlayTimeStr: '00:00',
})

const normalizeTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return 0
  return time
}

const clampCurrentTime = (currentTime: number, totalTime = playProgress.maxPlayTime) => {
  const safeCurrentTime = normalizeTime(currentTime)
  const safeTotalTime = normalizeTime(totalTime)
  if (!safeTotalTime) return safeCurrentTime
  return Math.min(safeCurrentTime, safeTotalTime)
}

const createProgressValue = (currentTime: number, totalTime = playProgress.maxPlayTime) => {
  const safeTotalTime = normalizeTime(totalTime)
  if (!safeTotalTime) return 0
  return Math.min(1, Math.max(0, currentTime / safeTotalTime))
}

export const setNowPlayTime = (time: number) => {
  const nextTime = clampCurrentTime(time)
  playProgress.nowPlayTime = nextTime
  playProgress.nowPlayTimeStr = formatPlayTime2(nextTime)
  playProgress.progress = createProgressValue(nextTime)
}

export const setMaxplayTime = (time: number) => {
  const nextTime = normalizeTime(time)
  playProgress.maxPlayTime = nextTime
  playProgress.maxPlayTimeStr = formatPlayTime2(nextTime)
  if (playProgress.nowPlayTime > nextTime && nextTime > 0) {
    playProgress.nowPlayTime = nextTime
    playProgress.nowPlayTimeStr = formatPlayTime2(nextTime)
  }
  playProgress.progress = createProgressValue(playProgress.nowPlayTime, nextTime)
}

export const setProgress = (currentTime: number, totalTime: number) => {
  setMaxplayTime(totalTime)
  setNowPlayTime(currentTime)
}
