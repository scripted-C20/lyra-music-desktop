<template lang="pug">
dt#desktop_lyric {{ $t('setting__desktop_lyric') }}
dd
  .gap-top
    base-checkbox(id="setting_desktop_lyric_enable" :model-value="appSetting['desktopLyric.enable']" :label="$t('setting__desktop_lyric_enable')" @update:model-value="updateSetting({ 'desktopLyric.enable': $event })")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_lock" :model-value="appSetting['desktopLyric.isLock']" :label="$t('setting__desktop_lyric_lock')" @update:model-value="updateSetting({ 'desktopLyric.isLock': $event })")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_fullscreen_hide" :model-value="appSetting['desktopLyric.fullscreenHide']" :label="$t('setting__desktop_lyric_fullscreen_hide')" @update:model-value="updateSetting({ 'desktopLyric.fullscreenHide': $event })")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_pause_hide" :model-value="appSetting['desktopLyric.pauseHide']" :label="$t('setting__desktop_lyric_pause_hide')" @update:model-value="updateSetting({ 'desktopLyric.pauseHide': $event })")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_audio_visualization" :model-value="appSetting['desktopLyric.audioVisualization']" :label="$t('setting__desktop_lyric_audio_visualization')" @update:model-value="updateSetting({ 'desktopLyric.audioVisualization': $event })")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_delayScroll" :model-value="appSetting['desktopLyric.isDelayScroll']" :label="$t('setting__desktop_lyric_delay_scroll')" @update:model-value="updateSetting({ 'desktopLyric.isDelayScroll': $event })")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_alwaysOnTop" :model-value="appSetting['desktopLyric.isAlwaysOnTop']" :label="$t('setting__desktop_lyric_always_on_top')" @update:model-value="updateSetting({ 'desktopLyric.isAlwaysOnTop': $event })")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_showTaskbar" :model-value="appSetting['desktopLyric.isShowTaskbar']" :label="$t('setting__desktop_lyric_show_taskbar')" @update:model-value="updateSetting({ 'desktopLyric.isShowTaskbar': $event })")
    line-icon(class="help-icon row-help-icon" :icon="CircleHelp" :size="13" :stroke-width="2.2" :aria-label="$t('setting__desktop_lyric_show_taskbar_tip')")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_alwaysOnTopLoop" :model-value="appSetting['desktopLyric.isAlwaysOnTopLoop']" :label="$t('setting__desktop_lyric_always_on_top_loop')" @update:model-value="updateSetting({ 'desktopLyric.isAlwaysOnTopLoop': $event })")
    line-icon(class="help-icon row-help-icon" :icon="CircleHelp" :size="13" :stroke-width="2.2" :aria-label="$t('setting__desktop_lyric_always_on_top_loop_tip')")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_lockScreen" :model-value="appSetting['desktopLyric.isLockScreen']" :label="$t('setting__desktop_lyric_lock_screen')" @update:model-value="updateSetting({ 'desktopLyric.isLockScreen': $event })")
  .gap-top(v-if="!isLinux")
    base-checkbox(id="setting_desktop_lyric_hoverHide" :model-value="appSetting['desktopLyric.isHoverHide']" :label="$t('setting__desktop_lyric_hover_hide')" @update:model-value="updateSetting({ 'desktopLyric.isHoverHide': $event })")
    line-icon(class="help-icon row-help-icon" :icon="CircleHelp" :size="13" :stroke-width="2.2" :aria-label="$t('setting__desktop_lyric_hover_hide_tip')")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_ellipsis" :model-value="appSetting['desktopLyric.style.ellipsis']" :label="$t('setting__desktop_lyric_ellipsis')" @update:model-value="updateSetting({ 'desktopLyric.style.ellipsis': $event })")
  .gap-top
    base-checkbox(id="setting_desktop_lyric_zoom" :model-value="appSetting['desktopLyric.style.isZoomActiveLrc']" :label="$t('desktop_lyric__lrc_active_zoom_on')" @update:model-value="updateSetting({ 'desktopLyric.style.isZoomActiveLrc': $event })")
  //- .gap-top
    base-checkbox(id="setting_desktop_lyric_fontWeight" :model-value="appSetting['desktopLyric.style.fontWeight']" @update:model-value="updateSetting({ 'desktopLyric.style.fontWeight': $event })" :label="$t('setting__desktop_lyric_font_weight')")

dd
  h3#setting__desktop_lyric_font_weight {{ $t('setting__desktop_lyric_font_weight') }}
  div
    base-checkbox.gap-left(id="setting_setting__desktop_lyric_font_weight_font" :model-value="appSetting['desktopLyric.style.isFontWeightFont']" :label="$t('setting__desktop_lyric_font_weight_font')" @update:model-value="updateSetting({ 'desktopLyric.style.isFontWeightFont': $event })")
    base-checkbox.gap-left(id="setting_setting__desktop_lyric_font_weight_line" :model-value="appSetting['desktopLyric.style.isFontWeightLine']" :label="$t('setting__desktop_lyric_font_weight_line')" @update:model-value="updateSetting({ 'desktopLyric.style.isFontWeightLine': $event })")
    base-checkbox.gap-left(id="setting_setting__desktop_lyric_font_weight_extended" :model-value="appSetting['desktopLyric.style.isFontWeightExtended']" :label="$t('setting__desktop_lyric_font_weight_extended')" @update:model-value="updateSetting({ 'desktopLyric.style.isFontWeightExtended': $event })")


dd
  h3#desktop_lyric_direction {{ $t('setting__desktop_lyric_direction') }}
  div
    base-checkbox.gap-left(id="setting_desktop_lyric_direction_horizontal" :model-value="appSetting['desktopLyric.direction']" need value="horizontal" :label="$t('setting__desktop_lyric_direction_horizontal')" @update:model-value="updateSetting({ 'desktopLyric.direction': $event })")
    base-checkbox.gap-left(id="setting_desktop_lyric_direction_vertical" :model-value="appSetting['desktopLyric.direction']" need value="vertical" :label="$t('setting__desktop_lyric_direction_vertical')" @update:model-value="updateSetting({ 'desktopLyric.direction': $event })")

dd
  h3#desktop_lyric_scroll_align {{ $t('setting__desktop_lyric_scroll_align') }}
  div
    base-checkbox.gap-left(id="setting_desktop_lyric_scroll_align_top" :model-value="appSetting['desktopLyric.scrollAlign']" need value="top" :label="$t('setting__desktop_lyric_scroll_align_top')" @update:model-value="updateSetting({ 'desktopLyric.scrollAlign': $event })")
    base-checkbox.gap-left(id="setting_desktop_lyric_scroll_align_center" :model-value="appSetting['desktopLyric.scrollAlign']" need value="center" :label="$t('setting__desktop_lyric_scroll_align_center')" @update:model-value="updateSetting({ 'desktopLyric.scrollAlign': $event })")

dd
  h3#desktop_lyric_align {{ $t('setting__desktop_lyric_align') }}
  div
    base-checkbox.gap-left(id="setting_desktop_lyric_align_left" :model-value="appSetting['desktopLyric.style.align']" need value="left" :label="$t('setting__desktop_lyric_align_left')" @update:model-value="updateSetting({ 'desktopLyric.style.align': $event })")
    base-checkbox.gap-left(id="setting_desktop_lyric_align_center" :model-value="appSetting['desktopLyric.style.align']" need value="center" :label="$t('setting__desktop_lyric_align_center')" @update:model-value="updateSetting({ 'desktopLyric.style.align': $event })")
    base-checkbox.gap-left(id="setting_desktop_lyric_align_right" :model-value="appSetting['desktopLyric.style.align']" need value="right" :label="$t('setting__desktop_lyric_align_right')" @update:model-value="updateSetting({ 'desktopLyric.style.align': $event })")

dd
  h3#desktop_lyric_line_gap {{ $t('setting__desktop_lyric_line_gap', { num: appSetting['desktopLyric.style.lineGap'] }) }}
  div
    .p
      base-btn.btn(min @click="changeLineGap(-1)") {{ $t('setting__desktop_lyric_line_gap_dec') }}
      base-btn.btn(min @click="changeLineGap(1)") {{ $t('setting__desktop_lyric_line_gap_add') }}
dd
  h3#desktop_lyric_color {{ $t('setting__desktop_lyric_color') }}
  div
    .p.gap-top
      div(:class="$style.groupContent")
        div(:class="$style.item")
          div(ref="lyric_unplay_color_ref" :class="$style.color" :style="getColorPreviewStyle(lyricPreviewColors.unplayColor)")
          div(:class="$style.label") {{ $t('setting__desktop_lyric_unplay_color') }}
        div(:class="$style.item")
          div(ref="lyric_played_color_ref" :class="$style.color" :style="getColorPreviewStyle(lyricPreviewColors.playedColor)")
          div(:class="$style.label") {{ $t('setting__desktop_lyric_played_color') }}
        div(:class="$style.item")
          div(ref="lyric_shadow_color_ref" :class="$style.color" :style="getColorPreviewStyle(lyricPreviewColors.shadowColor)")
          div(:class="$style.label") {{ $t('setting__desktop_lyric_shadow_color') }}
    .p.gap-top(:class="[$style.previewPanel, $style.previewWindow, $style.livePreviewWindow]" :style="getDesktopLyricPreviewPanelStyle()")
      .p(:class="$style.livePreviewMeta")
        span(:class="$style.previewLabel") 实时预览
        span(:class="$style.previewHint") 未播放 / 已播放
      .p(:class="$style.livePreviewLyrics")
        span(:class="[$style.previewLine, $style.previewUnplay]" :style="getPreviewTextStyle(lyricPreviewColors.unplayColor, lyricPreviewColors.shadowColor)") 还没播放的歌词
        span(:class="[$style.previewLine, $style.previewPlayed]" :style="getPreviewTextStyle(lyricPreviewColors.playedColor, lyricPreviewColors.shadowColor)") 当前高亮歌词
    .p.gap-top
      base-btn.btn(min @click="resetColor") {{ $t('setting__desktop_lyric_color_reset') }}
dd
  h3#desktop_lyric_background {{ $t('setting__desktop_lyric_background') }}
  div
    .p.gap-top
      div(:class="$style.groupContent")
        div(:class="$style.item")
          div(ref="lyric_background_color_ref" :class="$style.color" :style="getBackgroundColorPreviewStyle()")
          div(:class="$style.label") {{ $t('setting__desktop_lyric_background_color') }}
    .p.gap-top(:class="$style.backgroundPreviewStage")
      .p(:class="[$style.previewPanel, $style.previewWindow, $style.backgroundPreviewWindow]" :style="getDesktopLyricPreviewPanelStyle()")
        span(:class="$style.backgroundPreviewLabel") 背景预览
    .p.gap-top(:class="$style.opacityPanel")
      span(:class="$style.opacityLabel") {{ $t('setting__desktop_lyric_background_opacity', { num: appSetting['desktopLyric.style.backgroundOpacity'] }) }}
      base-slider-bar(:class="$style.opacitySlider" :value="appSetting['desktopLyric.style.backgroundOpacity']" :min="0" :max="100" @change="handleChangeBackgroundOpacity")
dd
  h3#desktop_lyric_font {{ $t('setting__desktop_lyric_font') }}
  div
    base-selection.gap-teft(:list="fontList" :model-value="appSetting['desktopLyric.style.font']" item-key="id" item-name="label" @update:model-value="updateSetting({ 'desktopLyric.style.font': $event })")

dd
  h3#desktop_lyric_reset {{ $t('setting__desktop_lyric_reset') }}
  div
    .p.gap-top
      base-btn.btn(min @click="resetWindowSetting") {{ $t('setting__desktop_lyric_reset_window') }}

</template>

<script>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from '@common/utils/vueTools'
import { CircleHelp } from 'lucide-vue-next'
import { getSystemFonts, onThemeChange } from '@renderer/utils/ipc'
import { isLinux } from '@common/utils'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { useI18n } from '@renderer/plugins/i18n'
import { pickrTools } from '@renderer/utils/pickrTools'
import defaultSetting from '@common/defaultSetting'
import { getDesktopLyricThemeColors } from '@common/theme/desktopLyricColors'
import { getDesktopLyricBackgroundStyles } from '@common/theme/desktopLyricBackground'

const defaultUnplayColors = [
  'rgba(255, 255, 255, 1)',
  'rgba(255, 236, 144, 1)',
  'rgba(144, 255, 206, 1)',
  'rgba(32, 255, 132, 1)',
  'rgba(255, 226, 32, 1)',
  'rgba(57, 203, 255, 1)',
  'rgba(217, 57, 255, 1)',
  'rgba(255, 57, 71, 1)',
]
const defaultPlayedColors = [
  'rgba(255, 236, 144, 1)',
  'rgba(144, 255, 206, 1)',
  'rgba(32, 255, 132, 1)',
  'rgba(255, 226, 32, 1)',
  'rgba(57, 203, 255, 1)',
  'rgba(7, 197, 86, 1)',
  'rgba(25, 181, 254, 1)',
  'rgba(217, 57, 255, 1)',
  'rgba(255, 57, 71, 1)',
]
const defaultShadowColors = [
  'rgba(0, 0, 0, 0.15)',
  'rgba(0, 0, 0, 0.18)',
]
const defaultBackgroundColors = [
  'rgba(12, 18, 28, 1)',
  'rgba(22, 30, 42, 1)',
  'rgba(32, 41, 56, 1)',
  'rgba(46, 31, 36, 1)',
  'rgba(33, 45, 68, 1)',
  'rgba(255, 255, 255, 1)',
]
const getThemeCssColor = (name) => {
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
const getCurrentLyricColorSetting = () => {
  return {
    unplayColor: appSetting['desktopLyric.style.lyricUnplayColor'],
    playedColor: appSetting['desktopLyric.style.lyricPlayedColor'],
    shadowColor: appSetting['desktopLyric.style.lyricShadowColor'],
  }
}
const resolveLyricPreviewColors = (colors) => {
  return getDesktopLyricThemeColors(getThemeCssColor('--color-primary'), colors)
}

const useLyricUnplayColor = () => {
  const lyric_unplay_color_ref = ref(null)
  let tools

  const initLyricUnplayColor = (color, changed, reset, show) => {
    if (!lyric_unplay_color_ref.value) return
    tools = pickrTools.create(lyric_unplay_color_ref.value, color, defaultUnplayColors, changed, reset, show)
  }
  const destroyLyricUnplayColor = () => {
    if (!tools) return
    tools.destroy()
    tools = null
  }
  const setLyricUnplayColor = (color) => {
    tools?.setColor(color)
  }

  return {
    lyric_unplay_color_ref,
    initLyricUnplayColor,
    destroyLyricUnplayColor,
    setLyricUnplayColor,
  }
}

const useLyricPlayedColor = () => {
  const lyric_played_color_ref = ref(null)
  let tools

  const initLyricPlayedColor = (color, changed, reset, show) => {
    if (!lyric_played_color_ref.value) return
    tools = pickrTools.create(lyric_played_color_ref.value, color, defaultPlayedColors, changed, reset, show)
  }
  const destroyLyricPlayedColor = () => {
    if (!tools) return
    tools.destroy()
    tools = null
  }
  const setLyricPlayedColor = (color) => {
    tools?.setColor(color)
  }

  return {
    lyric_played_color_ref,
    initLyricPlayedColor,
    destroyLyricPlayedColor,
    setLyricPlayedColor,
  }
}

const useLyricShadowColor = () => {
  const lyric_shadow_color_ref = ref(null)
  let tools

  const initLyricShadowColor = (color, changed, reset, show) => {
    if (!lyric_shadow_color_ref.value) return
    tools = pickrTools.create(lyric_shadow_color_ref.value, color, defaultShadowColors, changed, reset, show)
  }
  const destroyLyricShadowColor = () => {
    if (!tools) return
    tools.destroy()
    tools = null
  }
  const setLyricShadowColor = (color) => {
    tools?.setColor(color)
  }

  return {
    lyric_shadow_color_ref,
    initLyricShadowColor,
    destroyLyricShadowColor,
    setLyricShadowColor,
  }
}

const useLyricBackgroundColor = () => {
  const lyric_background_color_ref = ref(null)
  let tools

  const initLyricBackgroundColor = (color, changed, reset, show) => {
    if (!lyric_background_color_ref.value) return
    tools = pickrTools.create(lyric_background_color_ref.value, color, defaultBackgroundColors, changed, reset, show)
  }
  const destroyLyricBackgroundColor = () => {
    if (!tools) return
    tools.destroy()
    tools = null
  }
  return {
    lyric_background_color_ref,
    initLyricBackgroundColor,
    destroyLyricBackgroundColor,
  }
}

const useLyricColor = () => {
  const { lyric_unplay_color_ref, initLyricUnplayColor, destroyLyricUnplayColor, setLyricUnplayColor } = useLyricUnplayColor()
  const { lyric_played_color_ref, initLyricPlayedColor, destroyLyricPlayedColor, setLyricPlayedColor } = useLyricPlayedColor()
  const { lyric_shadow_color_ref, initLyricShadowColor, destroyLyricShadowColor, setLyricShadowColor } = useLyricShadowColor()
  const { lyric_background_color_ref, initLyricBackgroundColor, destroyLyricBackgroundColor } = useLyricBackgroundColor()
  let isSyncingThemePreview = false
  let lyricColorSnapshot = getCurrentLyricColorSetting()
  const lyricPreviewColors = reactive(resolveLyricPreviewColors(lyricColorSnapshot))

  const syncThemePreviewColors = (colors = getCurrentLyricColorSetting()) => {
    isSyncingThemePreview = true
    const previewColors = resolveLyricPreviewColors(colors)
    lyricPreviewColors.unplayColor = previewColors.unplayColor
    lyricPreviewColors.playedColor = previewColors.playedColor
    lyricPreviewColors.shadowColor = previewColors.shadowColor
    setLyricUnplayColor(previewColors.unplayColor)
    setLyricPlayedColor(previewColors.playedColor)
    setLyricShadowColor(previewColors.shadowColor)
    window.requestAnimationFrame(() => {
      isSyncingThemePreview = false
    })
  }

  const handleLyricColorChange = (settingKey, color) => {
    if (isSyncingThemePreview) return
    const colors = getCurrentLyricColorSetting()
    if (settingKey == 'desktopLyric.style.lyricUnplayColor') colors.unplayColor = color
    else if (settingKey == 'desktopLyric.style.lyricPlayedColor') colors.playedColor = color
    else colors.shadowColor = color
    updateSetting({ [settingKey]: color })
    window.requestAnimationFrame(() => {
      syncThemePreviewColors(colors)
    })
  }

  const captureLyricColorSnapshot = () => {
    lyricColorSnapshot = { ...getCurrentLyricColorSetting() }
  }

  const resetLyricColorSetting = () => {
    updateSetting({
      'desktopLyric.style.lyricUnplayColor': lyricColorSnapshot.unplayColor,
      'desktopLyric.style.lyricPlayedColor': lyricColorSnapshot.playedColor,
      'desktopLyric.style.lyricShadowColor': lyricColorSnapshot.shadowColor,
    })
    syncThemePreviewColors(lyricColorSnapshot)
  }

  const initColors = () => {
    initLyricUnplayColor(appSetting['desktopLyric.style.lyricUnplayColor'], (color) => {
      handleLyricColorChange('desktopLyric.style.lyricUnplayColor', color)
    }, resetLyricColorSetting, captureLyricColorSnapshot)
    initLyricPlayedColor(appSetting['desktopLyric.style.lyricPlayedColor'], (color) => {
      handleLyricColorChange('desktopLyric.style.lyricPlayedColor', color)
    }, resetLyricColorSetting, captureLyricColorSnapshot)
    initLyricShadowColor(appSetting['desktopLyric.style.lyricShadowColor'], (color) => {
      handleLyricColorChange('desktopLyric.style.lyricShadowColor', color)
    }, resetLyricColorSetting, captureLyricColorSnapshot)
    initLyricBackgroundColor(appSetting['desktopLyric.style.backgroundColor'], (color) => {
      updateSetting({ 'desktopLyric.style.backgroundColor': color })
    })
    syncThemePreviewColors()
  }

  const destroyColors = () => {
    destroyLyricUnplayColor()
    destroyLyricPlayedColor()
    destroyLyricShadowColor()
    destroyLyricBackgroundColor()
  }

  const resetColor = () => {
    const defaultColorSetting = {
      'desktopLyric.style.lyricUnplayColor': defaultLyricSetting['desktopLyric.style.lyricUnplayColor'],
      'desktopLyric.style.lyricPlayedColor': defaultLyricSetting['desktopLyric.style.lyricPlayedColor'],
      'desktopLyric.style.lyricShadowColor': defaultLyricSetting['desktopLyric.style.lyricShadowColor'],
    }
    updateSetting(defaultColorSetting)
    syncThemePreviewColors({
      unplayColor: defaultColorSetting['desktopLyric.style.lyricUnplayColor'],
      playedColor: defaultColorSetting['desktopLyric.style.lyricPlayedColor'],
      shadowColor: defaultColorSetting['desktopLyric.style.lyricShadowColor'],
    })
  }

  const defaultLyricSetting = defaultSetting
  let removeThemeChangeListener = null
  onMounted(() => {
    initColors()
    removeThemeChangeListener = onThemeChange(() => {
      window.requestAnimationFrame(() => {
        syncThemePreviewColors()
      })
    })
  })
  onBeforeUnmount(() => {
    removeThemeChangeListener?.()
    removeThemeChangeListener = null
    destroyColors()
  })
  watch(() => [
    appSetting['desktopLyric.style.lyricUnplayColor'],
    appSetting['desktopLyric.style.lyricPlayedColor'],
    appSetting['desktopLyric.style.lyricShadowColor'],
  ], () => {
    syncThemePreviewColors()
  })

  return {
    lyric_unplay_color_ref,
    lyric_played_color_ref,
    lyric_shadow_color_ref,
    lyric_background_color_ref,
    lyricPreviewColors,
    resetColor,
  }
}

export default {
  name: 'SettingDesktopLyric',
  setup() {
    const t = useI18n()

    const changeLineGap = (step) => {
      let gap = appSetting['desktopLyric.style.lineGap'] + step
      updateSetting({ 'desktopLyric.style.lineGap': Math.min(Math.max(gap, 0), 25) })
    }

    const {
      lyric_unplay_color_ref,
      lyric_played_color_ref,
      lyric_shadow_color_ref,
      lyric_background_color_ref,
      lyricPreviewColors,
      resetColor,
    } = useLyricColor()

    const systemFontList = ref([])
    const fontList = computed(() => {
      return [{ id: '', label: t('setting__desktop_lyric_font_default') }, ...systemFontList.value]
    })
    void getSystemFonts().then(fonts => {
      systemFontList.value = fonts.map(f => ({ id: f, label: f.replace(/(^"|"$)/g, '') }))
    })

    const resetWindowSetting = () => {
      updateSetting({
        'desktopLyric.width': 450,
        'desktopLyric.height': 300,
        'desktopLyric.x': null,
        'desktopLyric.y': null,
      })
    }

    return {
      appSetting,
      updateSetting,
      changeLineGap,
      lyric_unplay_color_ref,
      lyric_played_color_ref,
      lyric_shadow_color_ref,
      lyric_background_color_ref,
      lyricPreviewColors,
      resetColor,
      resetWindowSetting,
      handleChangeBackgroundOpacity(value) {
        updateSetting({ 'desktopLyric.style.backgroundOpacity': Math.round(value) })
      },
      getColorPreviewStyle(color) {
        return {
          '--preview-color': color,
        }
      },
      getBackgroundColorPreviewStyle() {
        const backgroundStyles = getDesktopLyricBackgroundStyles(
          appSetting['desktopLyric.style.backgroundColor'],
          appSetting['desktopLyric.style.backgroundOpacity'],
        )
        return {
          '--preview-color': backgroundStyles.solidColor,
        }
      },
      getPreviewTextStyle(color, shadowColor) {
        return {
          color,
          textShadow: `0 2px 10px ${shadowColor}`,
        }
      },
      getDesktopLyricPreviewPanelStyle() {
        const backgroundStyles = getDesktopLyricBackgroundStyles(
          appSetting['desktopLyric.style.backgroundColor'],
          appSetting['desktopLyric.style.backgroundOpacity'],
        )
        return {
          '--preview-window-solid': backgroundStyles.solidColor,
          '--preview-window-top': backgroundStyles.topColor,
          '--preview-window-bottom': backgroundStyles.bottomColor,
          '--preview-window-border': backgroundStyles.borderColor,
          '--preview-window-shadow': backgroundStyles.shadowColor,
          '--preview-window-glow': backgroundStyles.glowColor,
          '--preview-window-sheen': backgroundStyles.sheenColor,
          '--preview-window-highlight': backgroundStyles.highlightColor,
        }
      },

      fontList,
      isLinux,
      CircleHelp,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.groupContent {
  display: flex;
  flex-flow: row wrap;
}
.item {
  padding-right: 40px;
  width: 70px;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
}
.color {
  width: 80%;
  aspect-ratio: 1 / 1;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
    var(--preview-color);
  border-radius: @radius-border;
  cursor: pointer;
  transition: @transition-fast !important;
  transition-property: background-color, box-shadow, opacity !important;
  border: 1px solid rgba(255, 255, 255, 0.74);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 8px 18px rgba(15, 23, 42, 0.08);
  &:hover {
    opacity: .96;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 10px 20px rgba(15, 23, 42, 0.1);
  }
}
.label {
  .mixin-ellipsis-2();
  padding-top: 10px;
  text-align: center;
  line-height: 1.1;
}
.previewPanel {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.68), rgba(248, 249, 251, 0.86));
  border: 1px solid rgba(255, 255, 255, 0.76);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 10px 20px rgba(15, 23, 42, 0.05);
}
.previewWindow {
  position: relative;
  overflow: hidden;
  background-color: var(--preview-window-solid);
  background:
    radial-gradient(circle at top left, var(--color-primary-alpha-700), transparent 56%),
    linear-gradient(180deg, var(--preview-window-top), var(--preview-window-bottom));
  border-color: var(--preview-window-border);
  backdrop-filter: blur(16px) saturate(1.06);
  background-clip: padding-box;
  box-shadow:
    0 14px 28px var(--preview-window-shadow),
    0 8px 18px var(--preview-window-glow),
    inset 0 0 0 1px var(--preview-window-border),
    inset 0 0 0 1px var(--preview-window-highlight);

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(180deg, var(--preview-window-sheen), rgba(255, 255, 255, 0));
    pointer-events: none;
  }
}
.previewLabel {
  position: relative;
  z-index: 1;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .08em;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}
.previewHint {
  position: relative;
  z-index: 1;
  flex: none;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .04em;
  color: rgba(255, 255, 255, 0.52);
}
.previewLine {
  position: relative;
  z-index: 1;
  max-width: 100%;
  line-height: 1.08;
  text-align: center;
  .mixin-ellipsis-1();
}
.previewUnplay {
  font-size: 16px;
  font-weight: 600;
  opacity: .76;
}
.previewPlayed {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: .01em;
  opacity: 1;
}
.livePreviewWindow {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 12px;
  min-height: 102px;
  padding: 14px 16px 16px;
}
.livePreviewMeta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.livePreviewLyrics {
  display: flex;
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 48px;
  padding: 4px 8px 2px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent 68%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.backgroundPreviewStage {
  padding: 14px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, rgba(214, 66, 66, 0.18), transparent 42%),
    linear-gradient(135deg, rgba(18, 24, 34, 0.9), rgba(48, 58, 76, 0.78));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 14px 34px rgba(15, 23, 42, 0.12);
}
.backgroundPreviewWindow {
  width: min(100%, 560px);
  min-height: 128px;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 24px 28px;
}
.backgroundPreviewLabel {
  position: relative;
  z-index: 1;
  font-size: 14px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: .08em;
  color: rgba(255, 255, 255, 0.84);
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
}
.opacityPanel {
  display: flex;
  align-items: center;
  gap: 14px;
}
.opacityLabel {
  flex: none;
  font-size: 13px;
  color: var(--color-font);
  font-weight: 500;
}
.opacitySlider {
  width: min(260px, 100%);
}

</style>
