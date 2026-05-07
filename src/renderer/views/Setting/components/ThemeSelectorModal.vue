<template>
  <material-modal :show="modelValue" bg-close="bg-close" teleport="#view" @close="$emit('update:modelValue', false)">
    <main :class="$style.main">
      <div :class="$style.hero">
        <h2>{{ $t('theme_selector_modal__title') }}</h2>
        <p :class="$style.lead">{{ $t('theme_selector_modal__title_tip') }}</p>
      </div>
      <div class="scroll" :class="$style.content">
        <section :class="$style.section">
          <div :class="$style.sectionHeader">
            <h3>{{ $t('theme_selector_modal__light_title') }}</h3>
            <span :class="$style.sectionCount">{{ themeInfo.themeLights.length }}</span>
          </div>
          <ul :class="$style.theme">
            <li
              v-for="theme in themeInfo.themeLights" :key="theme.id"
              :style="theme.styles" :aria-label="theme.name"
              :class="[{[$style.active]: appSetting['theme.lightId'] == theme.id}]" @click="setLightId(theme.id)"
            >
              <span :class="$style.bg" />
              <label>{{ theme.name }}</label>
            </li>
          </ul>
        </section>
        <section :class="$style.section">
          <div :class="$style.sectionHeader">
            <h3>{{ $t('theme_selector_modal__dark_title') }}</h3>
            <span :class="$style.sectionCount">{{ themeInfo.themeDarks.length }}</span>
          </div>
          <ul :class="$style.theme">
            <li
              v-for="theme in themeInfo.themeDarks" :key="theme.id"
              :style="theme.styles" :aria-label="theme.name"
              :class="[{[$style.active]: appSetting['theme.darkId'] == theme.id}]" @click="setDarkId(theme.id)"
            >
              <span :class="$style.bg" />
              <label>{{ theme.name }}</label>
            </li>
          </ul>
        </section>
      </div>
    </main>
  </material-modal>
</template>

<script>
import { markRaw, reactive, watch } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { applyTheme, getThemes, buildBgUrl } from '@renderer/store/utils'

export default {
  name: 'ThemeSelectorModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props) {
    const resolveThemeName = (theme) => {
      const key = `theme_${theme.id}`
      // @ts-expect-error
      const name = window.i18n.t(key)
      return name === key ? (theme.name || theme.id) : name
    }
    const themeInfo = reactive({
      themeLights: [],
      themeDarks: [],
    })
    let dataPath = ''

    watch(() => props.modelValue, (val) => {
      if (!val) return
      getThemes((info) => {
      // console.log(info)
        const themes = [...info.themes, ...info.userThemes]
        const lights = []
        const darks = themes.filter(t => {
          if (t.isDark) return true
          lights.push(t)
          return false
        })
        dataPath = info.dataPath
        themeInfo.themeLights = lights.map(t => {
          return {
            id: t.id,
            name: t.isCustom ? t.name : resolveThemeName(t),
            styles: {
              '--color-primary-theme': t.config.themeColors['--color-theme'],
              '--background-image-theme': t.isCustom
                ? t.config.extInfo['--background-image'] == 'none'
                  ? 'none'
                  : buildBgUrl(t.config.extInfo['--background-image'], info.dataPath)
                : t.config.extInfo['--background-image'],
            },
          }
        })
        themeInfo.themeDarks = markRaw(darks.map(t => {
          return {
            id: t.id,
            name: t.isCustom ? t.name : resolveThemeName(t),
            styles: {
              '--color-primary-theme': t.config.themeColors['--color-theme'],
              '--background-image-theme': t.isCustom
                ? t.config.extInfo['--background-image'] == 'none'
                  ? 'none'
                  : buildBgUrl(t.config.extInfo['--background-image'], info.dataPath)
                : t.config.extInfo['--background-image'],
            },
          }
        }))
      })
    })

    const setLightId = (id) => {
      if (appSetting['theme.lightId'] == id) return
      updateSetting({ 'theme.lightId': id })
      if (appSetting['theme.id'] == 'auto') applyTheme('auto', id, appSetting['theme.darkId'], dataPath)
    }
    const setDarkId = (id) => {
      if (appSetting['theme.darkId'] == id) return
      updateSetting({ 'theme.darkId': id })
      if (appSetting['theme.id'] == 'auto') applyTheme('auto', appSetting['theme.lightId'], id, dataPath)
    }
    return {
      appSetting,
      themeInfo,
      setLightId,
      setDarkId,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.main {
  width: min(92vw, 780px);
  min-width: 320px;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  color: var(--ui-text-primary);
}
.hero {
  padding: 0 28px 8px;
}
h2 {
  flex: none;
  font-size: var(--ui-font-title);
  font-weight: 700;
  color: var(--ui-text-primary);
  line-height: 1.3;
  text-align: left;
}
.lead {
  margin-top: 8px;
  font-size: var(--ui-font-caption);
  line-height: var(--ui-line-body);
  color: var(--ui-text-tertiary);
}
h3 {
  color: var(--ui-text-secondary);
  line-height: 1.3;
  font-size: var(--ui-font-section);
  font-weight: 600;
}
.content {
  flex: auto;
  padding: 20px 28px 24px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.section {
  padding: 16px;
  border-radius: @radius-card;
  border: 1px solid rgba(229, 231, 235, 0.96);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.988), rgba(246, 246, 248, 0.98));
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.045);
}
.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
}
.sectionCount {
  flex: none;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-primary-alpha-900);
  color: var(--ui-text-accent);
  font-size: var(--ui-font-meta);
  font-weight: 700;
}
.theme {
  display: flex;
  flex-flow: row wrap;
  align-items: stretch;
  gap: 10px;

  li {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: flex-start;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: .24s ease;
    transition-property: color, transform, box-shadow, border-color, background-color;
    width: calc(50% - 5px);
    min-width: 108px;
    min-height: 110px;
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
      right: 10px;
      top: 10px;
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
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
      &:before {
        background: var(--color-primary);
        box-shadow: 0 0 0 4px var(--color-primary-light-300-alpha-800);
      }
      .bg {
        border-color: var(--color-primary-light-100-alpha-400);
        box-shadow: 0 0 0 3px var(--color-primary-light-300-alpha-800);
      }
      label {
        color: var(--ui-text-primary);
      }
    }

    .bg {
      display: block;
      width: min(100%, 96px);
      height: 54px;
      margin: 0 auto 10px;
      border: 1.5px solid rgba(0, 0, 0, 0.06);
      padding: 5px;
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

    label {
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
      .mixin-ellipsis(2);
    }
  }
}

@media (max-width: 860px) {
  .content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .hero,
  .content {
    padding-left: 22px;
    padding-right: 22px;
  }

  .theme li {
    width: 100%;
  }
}

</style>
