import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { setting } from '@lyric/store/state'
import { onThemeChange } from '@lyric/utils/ipc'
import { getDesktopLyricThemeColors } from '@common/theme/desktopLyricColors'

const getThemePrimaryColor = () => {
  return window.getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
}

export default () => {
  const applyLyricColors = (themeColors?: Record<string, string>) => {
    const {
      unplayColor,
      playedColor,
      shadowColor,
      shadowFontModeColor,
    } = getDesktopLyricThemeColors(themeColors?.['--color-primary'] ?? getThemePrimaryColor(), {
      unplayColor: setting['desktopLyric.style.lyricUnplayColor'],
      playedColor: setting['desktopLyric.style.lyricPlayedColor'],
      shadowColor: setting['desktopLyric.style.lyricShadowColor'],
    })

    window.setLyricColor({
      '--color-lyric-unplay': unplayColor,
      '--color-lyric-played': playedColor,
      '--color-lyric-shadow': shadowColor,
      '--color-lyric-shadow-font-mode': shadowFontModeColor,
    })
  }

  const rThemeChange = onThemeChange(({ params: themeSetting }) => {
    window.setTheme(themeSetting.theme.colors)
    applyLyricColors(themeSetting.theme.colors)
  })
  watch(() => [setting['desktopLyric.style.lyricUnplayColor'], setting['desktopLyric.style.lyricPlayedColor'], setting['desktopLyric.style.lyricShadowColor']], ([unplayColor, playedColor, shadowColor]) => {
    void unplayColor
    void playedColor
    void shadowColor
    applyLyricColors()
  }, {
    immediate: true,
  })

  onBeforeUnmount(() => {
    rThemeChange()
  })
}
