<template lang="pug">
dt#basic {{ $t('setting__basic') }}
dd
  div
    .gap-top
      base-checkbox(id="setting_show_animate" :model-value="appSetting['common.isShowAnimation']" :label="$t('setting__basic_show_animation')" @update:model-value="updateSetting({'common.isShowAnimation': $event})")
    .gap-top
      base-checkbox(id="setting_animate" :disabled="!appSetting['common.isShowAnimation']" :model-value="appSetting['common.randomAnimate']" :label="$t('setting__basic_animation')" @update:model-value="updateSetting({'common.randomAnimate': $event})")
    .gap-top
      base-checkbox(id="setting_start_in_fullscreen" :model-value="appSetting['common.startInFullscreen']" :label="$t('setting__basic_start_in_fullscreen')" @update:model-value="updateSetting({'common.startInFullscreen': $event})")
    .gap-top
      base-checkbox(id="setting_to_tray" :model-value="appSetting['tray.enable']" :label="$t('setting__basic_to_tray')" @update:model-value="updateSetting({'tray.enable': $event})")
    .p.gap-top
      base-btn.btn(min @click="isShowPlayTimeoutModal = true") {{ $t('setting__play_timeout')}} {{ timeLabel ? ` (${timeLabel})` : '' }}

dd
  h3#basic_theme {{ $t('setting__basic_theme') }}
  div
    ul(:class="$style.theme")
      li(v-for="theme in themeList" :key="theme.id" :aria-label="theme.name" :style="theme.styles" :class="[$style.themeItem, {[$style.active]: themeId == theme.id}]" @click="toggleTheme(theme)" @contextmenu="handleEditTheme(theme)")
        div(:class="$style.bg")
        span(:class="$style.label") {{ theme.name }}
      li(:aria-label="$t('theme_auto_tip')" :style="autoTheme" :class="[$style.themeItem, $style.auto, {[$style.active]: themeId == 'auto'}]" @click="handleSetThemeAuto" @contextmenu="isShowThemeSelectorModal = true")
        div(:class="$style.bg")
          div(:class="$style.bgContent")
            div(:class="$style.light")
            div(:class="$style.dark")
        span(:class="$style.label") {{ $t('theme_auto') }}
      li(v-if="showAllTheme" :aria-label="$t('theme_add')" :class="[$style.themeItem, $style.add]" @click="handleEditTheme()")
        div(:class="$style.bg")
          div(:class="$style.bgContent")
            line-icon(:class="$style.icon" :icon="Plus" :size="18" :stroke-width="2.2")
        span(:class="$style.label") {{ $t('theme_add') }}
      li(v-if="!showAllTheme" :aria-label="$t('theme_more_btn_show')" :class="[$style.themeItem, $style.moreThme]" @click="showAllTheme = true")
        span(:class="$style.label") {{ $t('theme_more_btn_show') }}
        svg-icon(name="angle-right-solid" :class="$style.activeIcon")

dd
  h3#basic_source {{ $t('setting__basic_source') }}
  div
    .gap-top(v-for="item in apiSources" :key="item.id")
      base-checkbox(
        :id="`setting_api_source_${item.id}`" name="setting_api_source"
        need :model-value="appSetting['common.apiSource']" :disabled="item.disabled" :value="item.id" :aria-label="item.label" @update:model-value="updateSetting({'common.apiSource': $event})")
        span(:class="$style.sourceLabel")
          | {{ item.name }}
          span(v-if="item.desc" :class="$style.desc") {{ item.desc }}
          span(v-if="item.statusLabel" :class="$style.status") {{ item.statusLabel }}
    .p.gap-top
      base-btn.btn(min @click="isShowUserApiModal = true") {{ $t('setting__basic_source_user_api_btn') }}
    .p.gap-top
      .p.small {{ $t('setting__basic_source_search_timeout') }}
      .p(:class="$style.sourceTimeout")
        base-input(
          :class="$style.timeoutInput"
          :model-value="appSetting['common.sourceSearchTimeout']"
          type="number"
          @update:model-value="setSourceSearchTimeout"
        )
        span(:class="$style.timeoutUnit") {{ $t('setting__basic_source_search_timeout_unit') }}
      .p.small(:class="$style.sourceTimeoutTip") {{ $t('setting__basic_source_search_timeout_tip') }}

dd
  h3#basic_window_size {{ $t('setting__basic_window_size') }}
  div
    base-checkbox.gap-left(
      v-for="item in windowSizeOptions" :id="`setting_window_size_${item.id}`" :key="item.id"
      name="setting_window_size" need :model-value="windowSizeSelectionValue" :value="item.id"
      :label="item.name == fullscreenWindowSizeId ? $t('fullscreen') : $t('setting__basic_window_size_' + item.name)"
      @update:model-value="handleWindowSizeChange")

dd
  h3#basic_font_size {{ $t('setting__basic_font_size') }}
  div
    //- base-selection.gap-teft(:list="fontSizeList" :model-value="appSetting['common.fontSize']" @update:model-value="updateSetting({'common.fontSize': $event})")
    base-checkbox.gap-left(
      v-for="item in fontSizeList" :id="`setting_basic_font_size_${item.id}`" :key="item.id"
      name="setting_basic_font_size" need :model-value="appSetting['common.fontSize']" :value="item.id"
      :label="item.label" :disabled="isFullscreen" @update:model-value="updateSetting({'common.fontSize': $event})")

dd
  h3#basic_font {{ $t('setting__basic_font') }}
  div(style="--selection-width: 12rem;")
    base-selection.gap-left(:list="fontList" :model-value="fonts[0]" item-key="id" item-name="label" @update:model-value="updateFonts($event, fonts[1])")
    base-selection.gap-left(v-if="fonts[0]" :list="fontList" :model-value="fonts[1]" item-key="id" item-name="label" @update:model-value="updateFonts(fonts[0], $event)")
    //- base-selection.gap-teft(:list="fontList" :model-value="appSetting['common.font']" item-key="id" item-name="label" @update:model-value="updateSetting({'common.font': $event})")

dd
  h3#basic_lang {{ $t('setting__basic_lang') }}
  div
    base-checkbox.gap-left(
      v-for="item in langList" :id="`setting_lang_${item.locale}`" :key="item.locale" name="setting_lang"
      need :model-value="appSetting['common.langId']" :value="item.locale" :label="item.name" @update:model-value="updateSetting({'common.langId': $event})")

dd
  h3#basic_sourcename {{ $t('setting__basic_sourcename') }}
  div
    base-checkbox.gap-left(
      v-for="item in sourceNameTypes" :id="`setting_abasic_sourcename_${item.id}`" :key="item.id"
      name="setting_basic_sourcename" need :model-value="appSetting['common.sourceNameType']" :value="item.id" :label="item.label" @update:model-value="updateSetting({'common.sourceNameType': $event})")
ThemeSelectorModal(v-model="isShowThemeSelectorModal")
ThemeEditModal(v-model="isShowThemeEditModal" :theme-id="editThemeId" @submit="handleRefreshTheme")
play-timeout-modal(v-model="isShowPlayTimeoutModal")
user-api-modal(v-model="isShowUserApiModal")
</template>

<script>
import { computed, ref, watch, reactive, shallowReactive } from '@common/utils/vueTools'
import { debounce } from '@common/utils'
import { normalizeSourceSearchTimeout } from '@common/constants'
import { Plus } from 'lucide-vue-next'
import { windowSizeList, userApi, isFullscreen, isWindowMaximized, themeId } from '@renderer/store'
import { langList, useI18n } from '@root/lang'
import { getSystemFonts, maxWindow, setFullScreen, setWindowSize } from '@renderer/utils/ipc'
import apiSourceInfo from '@renderer/utils/musicSdk/api-source-info'
import { useTimeout } from '@renderer/core/player/timeoutStop'
import { dialog } from '@renderer/plugins/Dialog'

import ThemeSelectorModal from './ThemeSelectorModal.vue'
import ThemeEditModal from './ThemeEditModal/index.vue'
import PlayTimeoutModal from './PlayTimeoutModal.vue'
import UserApiModal from './UserApiModal.vue'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { getThemes, applyTheme, findTheme, buildBgUrl } from '@renderer/store/utils'

export default {
  name: 'SettingBasic',
  components: {
    ThemeSelectorModal,
    ThemeEditModal,
    PlayTimeoutModal,
    UserApiModal,
  },
  setup() {
    const t = useI18n()
    const fullscreenWindowSizeId = 'fullscreen'
    const resolveThemeName = (theme) => {
      const key = `theme_${theme.id}`
      const name = t(key)
      return name === key ? (theme.name || theme.id) : name
    }

    const showAllTheme = ref(false)
    const defaultThemesRaw = shallowReactive([])
    const defaultThemes = computed(() => {
      return defaultThemesRaw.map(theme => ({ ...theme, isDefault: true, name: resolveThemeName(theme) }))
    })
    const userThemes = shallowReactive([])
    const allThemes = computed(() => {
      return [...defaultThemes.value, ...userThemes]
    })
    const compactThemeList = computed(() => {
      if (!allThemes.value.length) return []
      if (themeId.value == 'auto') return []
      const currentTheme = allThemes.value.find(t => t.id == themeId.value) ?? allThemes.value[0]
      return [
        currentTheme,
        ...allThemes.value.filter(theme => theme.id != currentTheme.id).slice(0, 2),
      ]
    })
    const themeList = computed(() => {
      return showAllTheme.value
        ? allThemes.value
        : compactThemeList.value
    })
    const autoTheme = reactive({})
    const updateAutoTheme = (info) => {
      let light = findTheme(info, appSetting['theme.lightId'])
      light ??= info.themes.find(theme => theme.id == 'netease')
      let dark = findTheme(info, appSetting['theme.darkId'])
      dark ??= info.themes.find(theme => theme.id == 'black')
      autoTheme['--color-primary-theme-light'] = light.config.themeColors['--color-theme']
      autoTheme['--background-image-theme-light'] = light.isCustom
        ? light.config.extInfo['--background-image'] == 'none'
          ? 'none'
          : buildBgUrl(light.config.extInfo['--background-image'], info.dataPath)
        : light.config.extInfo['--background-image']
      autoTheme['--color-primary-theme-dark'] = dark.config.themeColors['--color-theme']
      autoTheme['--background-image-theme-dark'] = dark.isCustom
        ? dark.config.extInfo['--background-image'] == 'none'
          ? 'none'
          : buildBgUrl(dark.config.extInfo['--background-image'], info.dataPath)
        : dark.config.extInfo['--background-image']
    }

    let dataPath = ''
    const init = () => {
      getThemes((info) => {
        // console.log(info)
        dataPath = info.dataPath
        defaultThemesRaw.splice(0, defaultThemesRaw.length, ...info.themes.map(t => {
          return {
            id: t.id,
            name: t.name,
            styles: {
              '--color-primary-theme': t.config.themeColors['--color-theme'],
              '--background-image-theme': t.config.extInfo['--background-image'],
            },
          }
        }))
        userThemes.splice(0, userThemes.length, ...info.userThemes.map(t => {
          return {
            id: t.id,
            name: t.name,
            styles: {
              '--color-primary-theme': t.config.themeColors['--color-theme'],
              '--background-image-theme': t.config.extInfo['--background-image'] == 'none'
                ? 'none'
                : buildBgUrl(t.config.extInfo['--background-image'], info.dataPath),
            },
          }
        }))
        updateAutoTheme(info)
      })
    }
    const editThemeId = ref('')
    const handleEditTheme = (theme) => {
      // console.log(theme)
      if (theme?.isDefault) return
      if (!theme && userThemes.length >= 10) {
        void dialog({
          message: t('theme_max_tip'),
          confirmButtonText: t('alert_button_text'),
        })
        return
      }
      editThemeId.value = theme ? theme.id : ''
      isShowThemeEditModal.value = true
    }
    const handleRefreshTheme = () => {
      init()
    }
    init()
    const toggleTheme = (theme) => {
      if (themeId.value == theme.id) return
      themeId.value = theme.id
      applyTheme(theme.id, appSetting['theme.lightId'], appSetting['theme.darkId'], dataPath)
      updateSetting({ 'theme.id': theme.id })
    }

    watch(() => [appSetting['theme.lightId'], appSetting['theme.darkId']], () => {
      getThemes(updateAutoTheme)
    })
    const isShowThemeSelectorModal = ref(false)
    const handleSetThemeAuto = () => {
      if (themeId.value == 'auto') return
      if (window.localStorage.getItem('theme-auto-tip') != 'true') {
        window.localStorage.setItem('theme-auto-tip', 'true')
        void dialog({
          message: t('setting__basic_theme_auto_tip'),
          confirmButtonText: t('ok'),
        })
      }
      toggleTheme({ id: 'auto' })
    }
    const isShowThemeEditModal = ref(false)

    const isShowPlayTimeoutModal = ref(false)
    const { timeLabel } = useTimeout()

    const isShowUserApiModal = ref(false)
    const getApiStatus = () => {
      let status
      if (userApi.status) status = t('setting__basic_source_status_success')
      else if (userApi.message == 'initing') status = t('setting__basic_source_status_initing')
      else status = `${t('setting__basic_source_status_failed')}`

      return status
    }
    const apiSources = computed(() => {
      return [
        ...apiSourceInfo.map(api => ({
          id: api.id,
          name: api.name,
          label: api.name,
          disabled: api.disabled,
        })),
        ...userApi.list.map(api => ({
          id: api.id,
          name: api.name,
          label: `${api.name}${api.id == appSetting['common.apiSource'] ? `[${getApiStatus()}]` : ''}`,
          desc: [/^\d/.test(api.version) ? `v${api.version}` : api.version].filter(Boolean).join(', '),
          statusLabel: api.id == appSetting['common.apiSource'] ? `[${getApiStatus()}]` : '',
          status: api.status,
          message: api.message,
          disabled: false,
        })),
      ]
    })
    const setSourceSearchTimeout = debounce(value => {
      updateSetting({ 'common.sourceSearchTimeout': normalizeSourceSearchTimeout(value) })
    }, 500)

    const sourceNameTypes = computed(() => {
      return [
        { id: 'real', label: t('setting__basic_sourcename_real') },
        { id: 'alias', label: t('setting__basic_sourcename_alias') },
      ]
    })

    const windowSizeOptions = computed(() => {
      return [
        ...windowSizeList,
        { id: fullscreenWindowSizeId, name: fullscreenWindowSizeId },
      ]
    })
    const windowSizeSelectionValue = computed(() => {
      return (isFullscreen.value || isWindowMaximized.value) ? fullscreenWindowSizeId : appSetting['common.windowSizeId']
    })
    const handleWindowSizeChange = async(value) => {
      if (value === fullscreenWindowSizeId) {
        if (isFullscreen.value || isWindowMaximized.value) return
        isFullscreen.value = true
        const fullscreen = await setFullScreen(true).catch(() => null)
        isFullscreen.value = fullscreen ?? false
        return
      }

      if (isFullscreen.value) {
        isFullscreen.value = false
        const fullscreen = await setFullScreen(false).catch(() => null)
        if (fullscreen == null) {
          isFullscreen.value = true
          return
        }
        isFullscreen.value = fullscreen
        if (fullscreen) return
      }
      if (isWindowMaximized.value) {
        isWindowMaximized.value = false
        const maximized = await maxWindow().catch(() => null)
        if (maximized) {
          isWindowMaximized.value = true
          return
        }
      }

      const sizeInfo = windowSizeList.find(item => item.id === value)
      if (appSetting['common.windowSizeId'] === value) {
        if (sizeInfo) setWindowSize(sizeInfo.width, sizeInfo.height)
        return
      }
      updateSetting({ 'common.windowSizeId': value })
    }

    const systemFontList = ref([])
    const fontList = computed(() => {
      return [{ id: '', label: t('setting__desktop_lyric_font_default') }, ...systemFontList.value]
    })
    void getSystemFonts().then(fonts => {
      systemFontList.value = fonts.map(f => ({ id: f, label: f.replace(/(^"|"$)/g, '') }))
    })

    const fonts = computed(() => {
      if (!appSetting['common.font']) return ['', '']
      let [f1 = '', f2 = ''] = appSetting['common.font'].split(',')
      return [f1.trim(), f2.trim()]
    })
    const updateFonts = (font1, font2) => {
      let font = []
      if (font1) font.push(font1)
      if (font2) font.push(font2)
      updateSetting({ 'common.font': font.join(', ') })
    }
    const fontSizeList = computed(() => {
      return [
        { id: 14, label: t('setting__basic_font_size_14px') },
        { id: 15, label: t('setting__basic_font_size_15px') },
        { id: 16, label: t('setting__basic_font_size_16px') },
        { id: 17, label: t('setting__basic_font_size_17px') },
        { id: 18, label: t('setting__basic_font_size_18px') },
        { id: 19, label: t('setting__basic_font_size_19px') },
      ]
    })


    return {
      appSetting,
      updateSetting,
      userThemes,
      autoTheme,
      showAllTheme,
      themeList,
      fonts,
      updateFonts,
      // currentStting,
      // themes,
      // themeClassName,
      isShowThemeSelectorModal,
      isShowThemeEditModal,
      handleSetThemeAuto,
      isShowPlayTimeoutModal,
      timeLabel,
      apiSources,
      isShowUserApiModal,
      setSourceSearchTimeout,
      fullscreenWindowSizeId,
      windowSizeOptions,
      windowSizeSelectionValue,
      handleWindowSizeChange,
      langList,
      sourceNameTypes,
      fontList,
      isFullscreen,
      isWindowMaximized,
      toggleTheme,
      themeId,
      handleRefreshTheme,
      editThemeId,
      handleEditTheme,
      Plus,
      fontSizeList,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.theme {
  display: flex;
  flex-flow: row wrap;
  align-items: stretch;
  gap: 10px;
  margin-bottom: 0;

  .themeItem {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: flex-start;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: .3s ease;
    transition-property: color, transform, background-color, border-color, box-shadow;
    width: 92px;
    min-height: 108px;
    padding: 7px 7px 10px;
    border-radius: @radius-card;
    border: 1px solid var(--ncm-divider);
    background:
      radial-gradient(circle at top, var(--color-primary-alpha-900), transparent 42%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(247, 247, 249, 0.982));
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.04);

    &:before {
      content: '';
      position: absolute;
      right: 9px;
      top: 9px;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.12);
      transition: background-color .24s ease, box-shadow .24s ease;
    }

    &:hover {
      transform: translateY(-2px);
      border-color: rgba(221, 224, 229, 0.98);
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
    }

    &.active {
      color: var(--ui-text-primary);
      border-color: var(--color-primary);
      background:
        radial-gradient(circle at top, var(--color-primary-light-300-alpha-800), transparent 48%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.998), rgba(247, 247, 249, 0.992));
      box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
      &:before {
        background: var(--color-primary);
        box-shadow: 0 0 0 4px var(--color-primary-light-300-alpha-800);
      }
      .bg {
        border-color: var(--color-primary-light-100-alpha-400);
        box-shadow: 0 0 0 3px var(--color-primary-light-300-alpha-800);
      }
      .label {
        color: var(--ui-text-primary);
      }
    }

    .bg {
      display: block;
      width: min(100%, 68px);
      height: 46px;
      margin: 0 auto 10px;
      border: 1.5px solid rgba(0, 0, 0, 0.06);
      padding: 4px;
      transition: border-color .3s ease;
      border-radius: 14px;
      &:after {
        display: block;
        content: ' ';
        width: 100%;
        height: 100%;
        border-radius: 10px;
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        background-color: var(--color-primary-theme);
        background-image: var(--background-image-theme);
      }
    }

    .label {
      width: 100%;
      text-align: center;
      min-height: 2.3em;
      font-size: var(--ui-font-caption);
      line-height: var(--ui-line-compact);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ui-text-secondary);
      font-weight: 600;
    }

    &.auto {

      &.active {
        color: var(--ui-text-primary);
        .bg {
          border-color: var(--color-primary-light-100-alpha-400);
        }
        .label {
          color: var(--ui-text-primary);
        }
      }

      >.bg {
        &:after {
          content: none;
        }
      }
      .bgContent {
        position: relative;
        height: 100%;
        overflow: hidden;
        border-radius: 12px;
      }
      .light, .dark {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        &:after {
          display: block;
          content: ' ';
          width: 100%;
          height: 100%;
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
        }
      }
      .light {
        &:after {
          clip-path: polygon(0 0, 100% 0, 0 100%);
        }
        svg {
          fill: var(--color-primary-theme-light);
        }
        &:after {
          background-color: var(--color-primary-theme-light);
          background-image: var(--background-image-theme-light);
        }
      }
      .dark {
        &:after {
          clip-path: polygon(0 100%, 100% 0, 100% 100%);
        }
        svg {
          fill: var(--color-primary-theme-dark);
        }
        &:after {
          background-color: var(--color-primary-theme-dark);
          background-image: var(--background-image-theme-dark);
        }
      }
    }

    &.add {
      >.bg {
        &:after {
          content: none;
        }
        .bgContent {
          transition: .3s ease;
          transition-property: border, color;
          box-sizing: border-box;
          border: 1px dashed var(--ncm-divider-strong);
          color: var(--ui-text-tertiary);
          position: relative;
          height: 100%;
          overflow: hidden;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
        }
        .icon {
          display: block;
          width: 18px;
          height: 18px;
          margin: 0;
          flex: none;
          transform: translateY(0.5px);
        }
      }
      .label {
        color: var(--ui-text-tertiary);
      }
    }

    &.moreThme {
      flex-direction: row;
      width: auto;
      min-height: 46px;
      align-self: center;
      padding: 0 16px;
      gap: 8px;
      color: var(--ui-text-accent);
      border-radius: 999px;
      background: var(--color-primary-alpha-900);
      box-shadow: none;
      align-items: center;
      justify-content: center;
      &:before {
        content: none;
      }
      .label {
        min-height: auto;
        width: auto;
        color: inherit;
        font-size: var(--ui-font-caption);
        font-weight: 600;
      }

      .activeIcon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 12px;
        height: 12px;
        flex: none;
      }
    }
  }
}

.sourceLabel {
  flex: auto;
  margin-left: 8px;
  line-height: var(--ui-line-body);
  cursor: pointer;
  color: var(--ui-text-primary);

  .desc {
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-meta);
    margin-left: 8px;
  }

  .status {
    margin-left: 8px;
    color: var(--ui-text-accent);
    font-size: var(--ui-font-meta);
  }
}

.sourceTimeout {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeoutInput {
  width: 96px;
}

.timeoutUnit {
  color: var(--ui-text-secondary);
  font-size: var(--ui-font-caption);
}

.sourceTimeoutTip {
  color: var(--ui-text-tertiary);
}

</style>
