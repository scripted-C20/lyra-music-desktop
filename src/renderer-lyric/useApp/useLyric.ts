import { watch } from '@common/utils/vueTools'
import { setLyric, setVertical, setPlaybackRate } from '@lyric/core/lyric'
import { getStatus } from '@lyric/core/mainWindowChannel'
import { isPlay, setting } from '@lyric/store/state'

export default () => {
  const refreshLyric = () => {
    setLyric()
    if (!isPlay.value) return
    setTimeout(() => {
      getStatus()
    })
  }

  watch(() => setting['player.isShowLyricTranslation'], refreshLyric)
  watch(() => setting['player.isShowLyricRoma'], refreshLyric)
  watch(() => setting['player.isSwapLyricTranslationAndRoma'], refreshLyric)
  watch(() => setting['player.isPlayLxlrc'], refreshLyric)
  watch(() => setting['desktopLyric.style.layout'], refreshLyric)
  watch(() => setting['player.playbackRate'], (rate) => {
    setPlaybackRate(rate)
    if (isPlay.value) {
      setTimeout(() => {
        getStatus()
      })
    }
  })
  watch(() => setting['desktopLyric.direction'], (direction) => {
    setVertical(direction == 'vertical')
    // if (isPlay.value)
  })
}
