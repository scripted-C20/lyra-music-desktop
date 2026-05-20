<template>
  <material-modal :show="modelValue" max-height="90%" teleport="#view" @close="handleCancel">
    <main :class="$style.main">
      <h2>{{ themeId ? $t('theme_edit_modal__title_edit') : $t('theme_edit_modal__title_add') }}</h2>
      <div class="scroll" :class="$style.content">
        <div :class="[$style.group, $style.base]">
          <div :class="$style.groupContent">
            <div :class="$style.item">
              <div ref="primary_color_ref" :class="$style.color" />
              <div :class="$style.label">{{ $t('theme_edit_modal__primary') }}</div>
            </div>
            <div :class="$style.item">
              <div ref="font_color_ref" :class="$style.color" />
              <div :class="$style.label">{{ $t('theme_edit_modal__font') }}</div>
            </div>
            <div :class="$style.item">
              <div ref="app_bg_color_ref" :class="$style.color" />
              <div :class="$style.label">{{ $t('theme_edit_modal__app_bg') }}</div>
            </div>
            <div :class="$style.item">
              <div ref="aside_font_color_ref" :class="$style.color" />
              <div :class="$style.label">{{ $t('theme_edit_modal__aside_color') }}</div>
            </div>
            <div :class="$style.item">
              <div ref="main_bg_color_ref" :class="$style.color" />
              <div :class="$style.label">{{ $t('theme_edit_modal__main_bg') }}</div>
            </div>
            <div :class="[$style.item, $style.bg]">
              <div :class="[$style.bgImg, { [$style.hasBg]: !!bgImg }]" @click="selectBgImg">
                <img
v-if="bgImg" loading="lazy" decoding="async" :class="$style.img" :src="bgImg"
                  alt="Background Image"
>
                <line-icon v-else :class="$style.icon" :icon="ChevronRight" />
                <button :class="$style.removeBtn" type="button" @click.stop="removeBgImg">
                  <line-icon :icon="Trash2" :size="14" />
                </button>
              </div>
              <div :class="$style.label">{{ $t('theme_edit_modal__bg_image') }}</div>
            </div>
          </div>
        </div>
        <div :class="$style.row">
          <div :class="$style.group">
            <div :class="$style.groupTitle">
              <span :class="$style.title">{{ $t('theme_edit_modal__badge') }}</span>
              <span class="badge badge-theme-primary">{{ $t('tag__lossless') }}</span>
              <span class="badge badge-theme-secondary">{{ $t('tag__high_quality') }}</span>
              <span class="badge badge-theme-tertiary">kw</span>
            </div>
            <div :class="$style.groupContent">
              <div :class="$style.item">
                <div ref="badge_primary_color_ref" :class="$style.color" />
                <div :class="$style.label">{{ $t('theme_edit_modal__badge_primary') }}</div>
              </div>
              <div :class="$style.item">
                <div ref="badge_secondary_color_ref" :class="$style.color" />
                <div :class="$style.label">{{ $t('theme_edit_modal__badge_secondary') }}</div>
              </div>
              <div :class="$style.item">
                <div ref="badge_tertiary_color_ref" :class="$style.color" />
                <div :class="$style.label">{{ $t('theme_edit_modal__badge_tertiary') }}</div>
              </div>
            </div>
          </div>
          <div :class="$style.group">
            <div :class="$style.groupTitle">
              <span>{{ $t('theme_edit_modal__control_btn') }}</span>
              <div :class="$style.controlBtn">
                <button type="button" :class="$style.hide">
                  <line-icon
:class="$style.controlBtnIcon" :icon="RectangleHorizontal" :size="13"
                    :stroke-width="2.2"
/>
                </button>
                <button type="button" :class="$style.min">
                  <line-icon :class="$style.controlBtnIcon" :icon="Minus" :size="13" :stroke-width="2.2" />
                </button>
                <button type="button" :class="$style.close">
                  <line-icon :class="$style.controlBtnIcon" :icon="X" :size="13" :stroke-width="2.2" />
                </button>
              </div>
            </div>
            <div :class="$style.groupContent">
              <div :class="$style.item">
                <div ref="close_btn_color_ref" :class="$style.color" />
                <div :class="$style.label">{{ $t('theme_edit_modal__close_btn') }}</div>
              </div>
              <div :class="$style.item">
                <div ref="min_btn_color_ref" :class="$style.color" />
                <div :class="$style.label">{{ $t('theme_edit_modal__min_btn') }}</div>
              </div>
              <div :class="$style.item">
                <div ref="hide_btn_color_ref" :class="$style.color" />
                <div :class="$style.label">{{ $t('theme_edit_modal__hide_btn') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div :class="$style.footer">
        <div :class="$style.footerMeta">
          <base-input v-model="themeName" :class="$style.input" :placeholder="$t('theme_selector_modal__theme_name')" />
          <div :class="$style.toggleRow">
            <base-checkbox
id="theme_edit_modal__dark" v-model="isDark" :class="$style.checkbox"
              :label="$t('theme_edit_modal__dark')" @change="handleDark"
/>
            <div :class="$style.toggleGroup">
              <base-checkbox
id="theme_edit_modal__dark_font" v-model="isDarkFont" :class="$style.checkbox"
                :label="$t('theme_edit_modal__dark_font')" @change="handleDarkFont"
/>
              <base-checkbox
id="theme_edit_modal__preview" v-model="preview" :class="$style.checkbox"
                :label="$t('theme_edit_modal__preview')" @change="handlePreview"
/>
            </div>
          </div>
        </div>
        <div :class="$style.actionGroup">
          <base-btn v-if="themeId" :class="$style.btn" @click="handleRemove">{{ $t('theme_edit_modal__remove')
            }}</base-btn>
          <base-btn v-if="themeId" :class="$style.btn" @click="handleSaveNew">{{ $t('theme_edit_modal__save_new')
            }}</base-btn>
          <base-btn :class="$style.btn" @click="handleSubmit">{{ $t('btn_save') }}</base-btn>
        </div>
      </div>
    </main>
  </material-modal>
</template>

<script>
import { Trash2, RectangleHorizontal, Minus, X, ChevronRight } from 'lucide-vue-next'

import { joinPath, extname, copyFile, checkPath, createDir, removeFile, moveFile, basename } from '@common/utils/nodejs'
import { nextTick, ref, watch } from '@common/utils/vueTools'
import { applyTheme, buildThemeColors, getThemes, copyTheme } from '@renderer/store/utils'
import { isUrl, encodePath } from '@common/utils/common'
// import { appSetting, updateSetting } from '@renderer/store/setting'
// import { applyTheme, getThemes } from '@renderer/store/utils'
import { createThemeColors } from '@common/theme/utils'
import useMainColor from './useMainColor'
import useFontColor from './useFontColor'
import useAppBgColor from './useAppBgColor'
import useMainBgColor from './useMainBgColor'
import useAsideFontColor from './useAsideFontColor'
import useBadgePrimaryColor from './useBadgePrimaryColor'
import useBadgeSecondaryColor from './useBadgeSecondaryColor'
import useBadgeTertiaryColor from './useBadgeTertiaryColor'
import useCloseBtnColor from './useCloseBtnColor'
import useMinBtnColor from './useMinBtnColor'
import useHideBtnColor from './useHideBtnColor'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { removeTheme, saveTheme, showSelectDialog } from '@renderer/utils/ipc'
import { dialog } from '@renderer/plugins/Dialog'
import { themeInfo } from '@renderer/store'


export default {
  name: 'ThemeSelectorModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    themeId: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'submit'],
  setup(props, { emit }) {
    const themeName = ref('')
    const isDark = ref(false)
    const isDarkFont = ref(false)
    const preview = ref(false)
    const bgImg = ref('')
    let bgImgRaw = ''
    let originBgName = ''
    let currentBgPath = ''

    let theme

    const getColor = (color, theme) => {
      return color.startsWith('var')
        ? theme.config.themeColors[color.replace(/var\((.+)\)/, '$1')]
        : color
    }

    const createPreview = () => {
      if (!preview.value) return
      window.setTheme(buildThemeColors(theme, themeInfo.dataPath))
    }

    // '--color-app-background': string
    // '--color-main-background': string
    // '--color-nav-font': string
    // '--background-image': string
    // '--background-image-position': string
    // '--background-image-size': string

    // // 关闭按钮颜色
    // '--color-btn-hide': string
    // '--color-btn-min': string
    // '--color-btn-close': string

    // // 徽章颜色
    // '--color-badge-primary': string
    // '--color-badge-secondary': string
    // '--color-badge-tertiary': string
    const { primary_color_ref, initMainColor, destroyMainColor } = useMainColor()
    const { font_color_ref, initFontColor, destroyFontColor } = useFontColor()
    const { app_bg_color_ref, initAppBgColor, destroyAppBgColor, setAppBgColor } = useAppBgColor()
    const { aside_font_color_ref, initAsideFontColor, destroyAsideFontColor, setAsideFontColor } = useAsideFontColor()
    const { main_bg_color_ref, initMainBgColor, destroyMainBgColor, setMainBgColor } = useMainBgColor()
    const { badge_primary_color_ref, initBadgePrimaryColor, destroyBadgePrimaryColor, setBadgePrimaryColor } = useBadgePrimaryColor()
    const { badge_secondary_color_ref, initBadgeSecondaryColor, destroyBadgeSecondaryColor, setBadgeSecondaryColor } = useBadgeSecondaryColor()
    const { badge_tertiary_color_ref, initBadgeTertiaryColor, destroyBadgeTertiaryColor, setBadgeTertiaryColor } = useBadgeTertiaryColor()
    const { close_btn_color_ref, initCloseBtnColor, destroyCloseBtnColor, setCloseBtnColor } = useCloseBtnColor()
    const { min_btn_color_ref, initMinBtnColor, destroyMinBtnColor, setMinBtnColor } = useMinBtnColor()
    const { hide_btn_color_ref, initHideBtnColor, destroyHideBtnColor, setHideBtnColor } = useHideBtnColor()

    let appBgColorOrigin
    let appBgColor
    let asideFontColorOrigin
    let asideFontColor
    let mainBgColorOrigin
    let mainBgColor
    let badgePrimaryColorOrigin
    let badgePrimaryColor
    let badgeSecondaryColorOrigin
    let badgeSecondaryColor
    let badgeTertiaryColorOrigin
    let badgeTertiaryColor
    let closeBtnColorOrigin
    let closeBtnColor
    let minBtnColorOrigin
    let minBtnColor
    let hideBtnColorOrigin
    let hideBtnColor

    const applyPrimaryColor = (color, fontColor, isDark, isDarkFont) => {
      theme.config.themeColors = createThemeColors(color, fontColor, isDark, isDarkFont)
      if (theme.config.extInfo['--color-app-background'].startsWith('var')) setAppBgColor(getColor(appBgColorOrigin, theme))
      if (theme.config.extInfo['--color-nav-font'].startsWith('var')) setAsideFontColor(getColor(asideFontColorOrigin, theme))
      if (theme.config.extInfo['--color-main-background'].startsWith('var')) setMainBgColor(getColor(mainBgColorOrigin, theme))
      if (theme.config.extInfo['--color-badge-primary'].startsWith('var')) setBadgePrimaryColor(getColor(badgePrimaryColorOrigin, theme))
      if (theme.config.extInfo['--color-badge-secondary'].startsWith('var')) setBadgeSecondaryColor(getColor(badgeSecondaryColorOrigin, theme))
      if (theme.config.extInfo['--color-badge-tertiary'].startsWith('var')) setBadgeTertiaryColor(getColor(badgeTertiaryColorOrigin, theme))
      if (theme.config.extInfo['--color-btn-close'].startsWith('var')) setCloseBtnColor(getColor(closeBtnColorOrigin, theme))
      if (theme.config.extInfo['--color-btn-min'].startsWith('var')) setMinBtnColor(getColor(minBtnColorOrigin, theme))
      if (theme.config.extInfo['--color-btn-hide'].startsWith('var')) setHideBtnColor(getColor(hideBtnColorOrigin, theme))

      createPreview()
    }

    const initColors = (_theme) => {
      theme = _theme
      // console.log(theme)
      themeName.value = theme.name
      isDark.value = theme.isDark
      isDarkFont.value = theme.isDarkFont ?? false
      currentBgPath = ''
      if (theme.config.extInfo['--background-image'] == 'none') {
        bgImg.value = ''
        bgImgRaw = ''
        originBgName = ''
      } else {
        bgImgRaw = isUrl(theme.config.extInfo['--background-image'])
          ? theme.config.extInfo['--background-image']
          : joinPath(themeInfo.dataPath, theme.config.extInfo['--background-image'])
        bgImg.value = encodePath(bgImgRaw)
        originBgName = theme.config.extInfo['--background-image']
      }
      appBgColorOrigin = theme.config.extInfo['--color-app-background']
      appBgColor = getColor(appBgColorOrigin, theme)
      asideFontColorOrigin = theme.config.extInfo['--color-nav-font']
      asideFontColor = getColor(asideFontColorOrigin, theme)
      mainBgColorOrigin = theme.config.extInfo['--color-main-background']
      mainBgColor = getColor(mainBgColorOrigin, theme)
      badgePrimaryColorOrigin = theme.config.extInfo['--color-badge-primary']
      badgePrimaryColor = getColor(badgePrimaryColorOrigin, theme)
      badgeSecondaryColorOrigin = theme.config.extInfo['--color-badge-secondary']
      badgeSecondaryColor = getColor(badgeSecondaryColorOrigin, theme)
      badgeTertiaryColorOrigin = theme.config.extInfo['--color-badge-tertiary']
      badgeTertiaryColor = getColor(badgeTertiaryColorOrigin, theme)
      closeBtnColorOrigin = theme.config.extInfo['--color-btn-close']
      closeBtnColor = getColor(closeBtnColorOrigin, theme)
      minBtnColorOrigin = theme.config.extInfo['--color-btn-min']
      minBtnColor = getColor(minBtnColorOrigin, theme)
      hideBtnColorOrigin = theme.config.extInfo['--color-btn-hide']
      hideBtnColor = getColor(hideBtnColorOrigin, theme)

      initMainColor(theme.config.themeColors['--color-primary'], (color) => {
        applyPrimaryColor(color, theme.config.themeColors['--color-1000'], theme.isDark, theme.isDarkFont)
      })
      initFontColor(theme.config.themeColors['--color-1000'] ?? (isDark ? 'rgb(229, 229, 229)' : 'rgb(33, 33, 33)'), (color) => {
        applyPrimaryColor(theme.config.themeColors['--color-primary'], color, theme.isDark, theme.isDarkFont)
      })
      initAppBgColor(appBgColor, (color) => {
        // console.log('appBgColor', color)
        theme.config.extInfo['--color-app-background'] = color == appBgColor ? appBgColorOrigin : color
        createPreview()
      }, () => { setAppBgColor(getColor(appBgColorOrigin, theme)) })
      initAsideFontColor(asideFontColor, (color) => {
        theme.config.extInfo['--color-nav-font'] = color == asideFontColor ? asideFontColorOrigin : color
        createPreview()
      }, () => { setAsideFontColor(getColor(asideFontColorOrigin, theme)) })
      initMainBgColor(mainBgColor, (color) => {
        theme.config.extInfo['--color-main-background'] = color == mainBgColor ? mainBgColorOrigin : color
        createPreview()
      }, () => { setMainBgColor(getColor(mainBgColorOrigin, theme)) })
      initBadgePrimaryColor(badgePrimaryColor, (color) => {
        theme.config.extInfo['--color-badge-primary'] = color == badgePrimaryColor ? badgePrimaryColorOrigin : color
        createPreview()
      }, () => { setBadgePrimaryColor(getColor(badgePrimaryColorOrigin, theme)) })
      initBadgeSecondaryColor(badgeSecondaryColor, (color) => {
        theme.config.extInfo['--color-badge-secondary'] = color == badgeSecondaryColor ? badgeSecondaryColorOrigin : color
        createPreview()
      }, () => { setBadgeSecondaryColor(getColor(badgeSecondaryColorOrigin, theme)) })
      initBadgeTertiaryColor(badgeTertiaryColor, (color) => {
        theme.config.extInfo['--color-badge-tertiary'] = color == badgeTertiaryColor ? badgeTertiaryColorOrigin : color
        createPreview()
      }, () => { setBadgeTertiaryColor(getColor(badgeTertiaryColorOrigin, theme)) })
      initCloseBtnColor(closeBtnColor, (color) => {
        theme.config.extInfo['--color-btn-close'] = color == closeBtnColor ? closeBtnColorOrigin : color
        createPreview()
      }, () => { setCloseBtnColor(getColor(closeBtnColorOrigin, theme)) })
      initMinBtnColor(minBtnColor, (color) => {
        theme.config.extInfo['--color-btn-min'] = color == minBtnColor ? minBtnColorOrigin : color
        createPreview()
      }, () => { setMinBtnColor(getColor(minBtnColorOrigin, theme)) })
      initHideBtnColor(hideBtnColor, (color) => {
        theme.config.extInfo['--color-btn-hide'] = color == hideBtnColor ? hideBtnColorOrigin : color
        createPreview()
      }, () => { setHideBtnColor(getColor(hideBtnColorOrigin, theme)) })

      createPreview()
    }
    const destroyColors = () => {
      destroyMainColor()
      destroyFontColor()
      destroyAppBgColor()
      destroyAsideFontColor()
      destroyMainBgColor()
      destroyBadgePrimaryColor()
      destroyBadgeSecondaryColor()
      destroyBadgeTertiaryColor()
      destroyCloseBtnColor()
      destroyMinBtnColor()
      destroyHideBtnColor()
    }

    watch(() => props.modelValue, (visible) => {
      void nextTick(() => {
        getThemes(({ themes, userThemes }) => {
          if (visible) {
            if (props.themeId) {
              const theme = userThemes.find(t => t.id == props.themeId)
              if (theme) {
                initColors(copyTheme(theme))
                return
              }
            }
            const theme = copyTheme(themes[0])
            theme.id = 'user_theme_' + Date.now()
            theme.name = ''
            theme.isCustom = true
            initColors(theme)
          } else {
            destroyColors()
            // 移除临时保存的背景
            if (currentBgPath) removeFile(currentBgPath).catch(_ => _)
          }
        })
      })
    })

    const selectBgImg = async() => {
      const result = await showSelectDialog({
        title: window.i18n.t('theme_edit_modal__select_bg_file'),
        properties: ['openFile'],
        filters: [
          {
            name: 'Image File',
            extensions: [
              'jpg', 'jpeg', 'jfif', 'pjpeg',
              'pjp', 'png', 'apng', 'avif', 'gif', 'svg',
              'webp', 'bmp'],
          },
        ],
      })
      if (result.canceled) return
      const path = result.filePaths[0]
      const fileName = `${theme.id}_${Date.now()}${extname(path)}`
      const tempDir = joinPath(themeInfo.dataPath, 'temp')
      const bgPath = joinPath(tempDir, fileName)
      if (!await checkPath(tempDir)) await createDir(tempDir)
      await copyFile(path, bgPath)
      currentBgPath = bgImgRaw = bgPath
      bgImg.value = encodePath(bgImgRaw)
      theme.config.extInfo['--background-image'] = 'temp/' + fileName

      createPreview()
    }
    const removeBgImg = async() => {
      if (currentBgPath) {
        void removeFile(currentBgPath)
        currentBgPath = ''
      }
      bgImg.value = ''
      bgImgRaw = ''
      theme.config.extInfo['--background-image'] = 'none'
      createPreview()
    }
    const handleDark = (val) => {
      theme.isDark = val
      applyPrimaryColor(theme.config.themeColors['--color-primary'], theme.config.themeColors['--color-1000'], theme.isDark, theme.isDarkFont)
    }
    const handleDarkFont = (val) => {
      theme.isDarkFont = val
      applyPrimaryColor(theme.config.themeColors['--color-primary'], theme.config.themeColors['--color-1000'], theme.isDark, theme.isDarkFont)
    }
    /**
     * 预览主题
     * @param {*} val 是否预览当前编辑的主题
     */
    const handlePreview = (val) => {
      if (val) {
        createPreview()
      } else {
        applyTheme(appSetting['theme.id'], appSetting['theme.lightId'], appSetting['theme.darkId'], themeInfo.dataPath)
      }
    }
    const handleCancel = () => {
      handlePreview(false)
      emit('update:modelValue', false)
    }
    // 保存
    const handleSubmit = async() => {
      if (!themeName.value) return
      theme.name = themeName.value.substring(0, 20)
      // 保存新背景
      if (currentBgPath && !isUrl(currentBgPath)) {
        const name = basename(currentBgPath)
        await moveFile(currentBgPath, joinPath(themeInfo.dataPath, name))
        theme.config.extInfo['--background-image'] = name
      }
      // 移除旧背景
      if (originBgName &&
        theme.config.extInfo['--background-image'] != originBgName &&
        !isUrl(theme.config.extInfo['--background-image'])) void removeFile(joinPath(themeInfo.dataPath, originBgName))
      if (props.themeId) {
        const index = themeInfo.userThemes.findIndex(t => t.id == theme.id)
        if (index > -1) themeInfo.userThemes.splice(index, 1, theme)
      } else themeInfo.userThemes.push(theme)
      handlePreview(false)
      await saveTheme(theme)
      emit('submit')
      emit('update:modelValue', false)
    }
    // 删除
    const handleRemove = async() => {
      const confirm = await dialog.confirm({
        message: window.i18n.t('theme_edit_modal__remove_tip'),
        cancelButtonText: window.i18n.t('cancel_button_text'),
        confirmButtonText: window.i18n.t('confirm_button_text'),
      })
      if (!confirm) return
      let isRequireUpdateSetting = false
      const newSetting = {}
      if (appSetting['theme.id'] == props.themeId) {
        newSetting['theme.id'] = 'netease'
        isRequireUpdateSetting = true
      }
      if (theme.isDark) {
        if (appSetting['theme.darkId'] == props.themeId) {
          newSetting['theme.darkId'] = 'black'
          isRequireUpdateSetting = true
        }
      } else {
        if (appSetting['theme.lightId'] == props.themeId) {
          newSetting['theme.lightId'] = 'netease'
          isRequireUpdateSetting = true
        }
      }
      if (isRequireUpdateSetting) updateSetting(newSetting)
      if (originBgName) void removeFile(joinPath(themeInfo.dataPath, originBgName))
      await removeTheme(props.themeId)
      const index = themeInfo.userThemes.findIndex(t => t.id == theme.id)
      if (index > -1) themeInfo.userThemes.splice(index, 1)
      handlePreview(false)
      emit('submit')
      emit('update:modelValue', false)
    }
    // 另存为
    const handleSaveNew = async() => {
      if (!themeName.value) return
      theme.name = themeName.value.substring(0, 20)
      theme.id = 'user_theme_' + Date.now()
      // 保存新背景
      if (!isUrl(currentBgPath)) {
        if (currentBgPath) {
          const name = basename(currentBgPath)
          await moveFile(currentBgPath, joinPath(themeInfo.dataPath, name))
          theme.config.extInfo['--background-image'] = name
        } else if (bgImgRaw) {
          const fileName = `${theme.id}_${Date.now()}${extname(bgImgRaw)}`
          await copyFile(bgImgRaw, joinPath(themeInfo.dataPath, fileName))
          theme.config.extInfo['--background-image'] = fileName
        }
      }
      themeInfo.userThemes.push(theme)
      handlePreview(false)
      await saveTheme(theme)
      emit('submit')
      emit('update:modelValue', false)
    }

    return {
      themeName,
      bgImg,
      isDark,
      handleDark,
      isDarkFont,
      handleDarkFont,
      preview,
      handlePreview,
      handleCancel,
      handleSubmit,
      handleRemove,
      handleSaveNew,
      selectBgImg,
      removeBgImg,
      primary_color_ref,
      font_color_ref,
      app_bg_color_ref,
      main_bg_color_ref,
      aside_font_color_ref,
      badge_primary_color_ref,
      badge_secondary_color_ref,
      badge_tertiary_color_ref,
      close_btn_color_ref,
      min_btn_color_ref,
      hide_btn_color_ref,
      Trash2,
      RectangleHorizontal,
      Minus,
      X,
      ChevronRight,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  width: min(92vw, 840px);
  min-width: 320px;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  color: var(--ui-text-primary);

  h2 {
    flex: none;
    padding: 0 28px 18px;
    font-size: var(--ui-font-title);
    font-weight: 700;
    line-height: 1.3;
    text-align: left;
  }

  h3 {
    margin: 0;
    font-size: var(--ui-font-section);
    font-weight: 600;
    color: var(--ui-text-secondary);
    line-height: 1.35;
  }
}

.content {
  flex: auto;
  padding: 0 28px 24px;
  font-size: var(--ui-font-body);
  gap: 16px;
  display: flex;
  flex-flow: column nowrap;
}

.group {
  border: 1px solid rgba(228, 228, 232, 0.98);
  border-radius: @radius-card;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 247, 249, 0.98));
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.045);
  overflow: hidden;
}

.groupTitle {
  padding: 18px 20px 0;
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  gap: 8px 10px;

  .title {
    margin-right: 2px;
  }
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.groupContent {
  display: flex;
  flex-flow: row wrap;
  gap: 14px;
  padding: 16px 20px 20px;
}

.item {
  width: 80px;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: 8px;
}

.base {
  .color {
    width: 100%;
  }
}

.color {
  width: 72px;
  aspect-ratio: 1 / 1;
  background-color: var(--pcr-color);
  border-radius: 16px;
  cursor: pointer;
  transition: @transition-fast !important;
  transition-property: background-color, opacity, transform, box-shadow !important;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.82),
    0 10px 20px rgba(15, 23, 42, 0.08);

  &:hover {
    opacity: .9;
    transform: translateY(-1px);
  }
}

.label {
  text-align: center;
  font-size: var(--ui-font-meta);
  line-height: var(--ui-line-compact);
  color: var(--ui-text-secondary);
}

.bg {
  width: 160px;
}

.bgImg {
  width: 100%;
  height: 74px;
  box-sizing: border-box;
  border: 1px dashed var(--color-primary-light-100-alpha-400);
  color: var(--ui-text-tertiary);
  position: relative;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: @transition-fast !important;
  transition-property: background-color, opacity, border-color, transform !important;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(250, 250, 251, 0.96), rgba(244, 244, 246, 0.96));

  &:hover {
    opacity: .92;
    transform: translateY(-1px);
    border-color: var(--color-primary-alpha-500);
  }

  &.hasBg {
    border: none;

    .removeBtn {
      display: block;
    }
  }

  .img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .removeBtn {
    position: absolute;
    right: 8px;
    top: 8px;
    border: none;
    cursor: pointer;
    padding: 7px;
    background-color: rgba(17, 24, 39, 0.58);
    color: rgba(255, 255, 255, 0.9);
    outline: none;
    transition: background-color 0.2s ease;
    line-height: 0;
    display: none;
    border-radius: 999px;
    backdrop-filter: blur(8px);

    &:hover {
      background-color: rgba(0, 0, 0, 0.7);
    }

    &:active {
      background-color: rgba(0, 0, 0, 0.8);
    }
  }

  .icon {
    width: auto;
    height: 56%;
  }
}

@control-btn-width: @height-toolbar * .26;

.controlBtn {
  display: flex;
  -webkit-app-region: no-drag;
  align-items: center;
  margin-left: auto;
  gap: 10px;
  padding: 4px;
  flex-direction: row-reverse;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(246, 247, 249, 0.82));
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  transition: opacity @transition-normal, box-shadow @transition-fast;
  opacity: .92;

  &:hover {
    box-shadow:
      0 10px 20px rgba(15, 23, 42, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.82);
  }

  button {
    display: flex;
    position: relative;
    background: none;
    border: none;
    outline: none;
    padding: 0;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 38px;
    height: 34px;
    border-radius: 12px;
    color: var(--color-font-label);
    box-shadow:
      0 2px 8px rgba(15, 23, 42, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);

    +button {
      margin-right: 0;
    }

    &.hide {
      background-color: var(--color-btn-hide);
    }

    &.min,
    &.fullscreenExit {
      background-color: var(--color-btn-min);
    }

    // &.max {
    //   background-color: var(--color-btn-max);
    // }
    &.close {
      background-color: var(--color-btn-close);
      color: var(--color-btn-font);
    }

    &:hover {
      color: var(--ui-text-accent);
      background-color: var(--color-primary-light-300-alpha-800);
    }

    &:active {
      color: var(--ui-text-accent);
      background-color: var(--color-primary-alpha-900);
    }
  }
}

.controlBtnIcon {
  opacity: .8;
  transition: opacity 0.15s ease;
  width: 14px;
  height: 14px;
}

.note {
  padding: 8px 15px;
  font-size: var(--ui-font-caption);
  line-height: var(--ui-line-body);
  color: var(--ui-text-tertiary);
}

.footer {
  padding: 18px 28px 24px;
  display: flex;
  flex-flow: row wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 18px;
  border-top: 1px solid rgba(228, 228, 232, 0.92);
}

.footerMeta {
  flex: 1 1 340px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 18px;
}

.toggleRow,
.toggleGroup {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 18px;
}

.toggleRow {
  flex: 1 1 auto;
}

.checkbox {
  flex: none;
}

.input {
  flex: 0 1 220px;
  min-width: 180px;
}

.actionGroup {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  min-width: 88px;
}

@media (max-width: 860px) {
  .main {
    width: min(96vw, 720px);
  }

  .footer {
    align-items: flex-start;
  }

  .actionGroup {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
