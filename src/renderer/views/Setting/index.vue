<template>
  <div :class="$style.main">
    <aside :class="$style.sidebar">
      <div :class="$style.sidebarCard">
        <div class="scroll" :class="$style.toc">
          <ul :class="$style.tocList" role="toolbar">
            <li v-for="h2 in tocList" :key="h2.id" :class="$style.tocListItem" role="presentation">
              <h2
:class="[$style.tocH2, { [$style.active]: avtiveComponentName == h2.id }]" role="tab"
                :aria-selected="avtiveComponentName == h2.id" :aria-label="h2.title" ignore-tip
                @click="toggleTab(h2.id)"
>
                <line-icon v-if="avtiveComponentName == h2.id" :icon="ChevronRight" :class="$style.activeIcon" />
                {{ h2.title }}
              </h2>
            </li>
          </ul>
        </div>
      </div>
    </aside>
    <section :class="$style.panel">
      <div ref="dom_content_ref" class="scroll" :class="$style.setting">
        <dl :class="$style.settingList">
          <component :is="avtiveComponentName" />
        </dl>
      </div>
    </section>
  </div>
</template>

<script>
import { ChevronRight } from 'lucide-vue-next'

import { ref, computed, nextTick } from '@common/utils/vueTools'
// import { currentStting } from './setting'
import { useI18n } from '@renderer/plugins/i18n'
import { useRoute } from '@common/utils/vueRouter'

import SettingBasic from './components/SettingBasic.vue'
import SettingPlay from './components/SettingPlay.vue'
import SettingPlayDetail from './components/SettingPlayDetail.vue'
import SettingDesktopLyric from './components/SettingDesktopLyric.vue'
import SettingSearch from './components/SettingSearch.vue'
import SettingList from './components/SettingList.vue'
import SettingDownload from './components/SettingDownload.vue'
import SettingSync from './components/SettingSync/index.vue'
import SettingOpenAPI from './components/SettingOpenAPI.vue'
import SettingHotKey from './components/SettingHotKey.vue'
import SettingNetwork from './components/SettingNetwork.vue'
import SettingOdc from './components/SettingOdc.vue'
import SettingBackup from './components/SettingBackup.vue'
import SettingOther from './components/SettingOther.vue'
import SettingAbout from './components/SettingAbout.vue'

export default {
  name: 'Setting',
  components: {
    SettingBasic,
    SettingPlay,
    SettingPlayDetail,
    SettingDesktopLyric,
    SettingSearch,
    SettingList,
    SettingDownload,
    SettingSync,
    SettingOpenAPI,
    SettingHotKey,
    SettingNetwork,
    SettingOdc,
    SettingBackup,
    SettingOther,
    SettingAbout,
  },
  setup() {
    const t = useI18n()
    const route = useRoute()

    const dom_content_ref = ref(null)

    const tocList = computed(() => {
      return [
        { id: 'SettingBasic', title: t('setting__basic') },
        { id: 'SettingPlay', title: t('setting__play') },
        { id: 'SettingPlayDetail', title: t('setting__play_detail') },
        { id: 'SettingDesktopLyric', title: t('setting__desktop_lyric') },
        { id: 'SettingSearch', title: t('setting__search') },
        { id: 'SettingList', title: t('setting__list') },
        { id: 'SettingDownload', title: t('setting__download') },
        { id: 'SettingHotKey', title: t('setting__hot_key') },
        { id: 'SettingSync', title: t('setting__sync') },
        { id: 'SettingOpenAPI', title: t('setting__open_api') },
        { id: 'SettingNetwork', title: t('setting__network') },
        { id: 'SettingOdc', title: t('setting__odc') },
        { id: 'SettingBackup', title: t('setting__backup') },
        { id: 'SettingOther', title: t('setting__other') },
        { id: 'SettingAbout', title: t('setting__about') },
      ]
    })

    const avtiveComponentName = ref(route.query.name && tocList.value.some(t => t.id == route.query.name)
      ? route.query.name
      : tocList.value[0].id)

    const toggleTab = id => {
      avtiveComponentName.value = id
      void nextTick(() => {
        dom_content_ref.value?.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      })
    }

    return {
      tocList,
      avtiveComponentName,
      dom_content_ref,
      toggleTab,
      ChevronRight,
    }
  },
  // mounted() {
  //   this.initTOC()
  // },
  // methods: {
  //   initTOC() {
  //     const list = this.$refs.dom_setting_list.children
  //     const toc = []
  //     let prevTitle
  //     for (const item of list) {
  //       if (item.tagName == 'DT') {
  //         prevTitle = {
  //           title: item.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: item.getAttribute('id'),
  //           dom: item,
  //           children: [],
  //         }
  //         toc.push(prevTitle)
  //         continue
  //       }
  //       const h3 = item.querySelector('h3')
  //       if (h3) {
  //         prevTitle.children.push({
  //           title: h3.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: h3.getAttribute('id'),
  //           dom: h3,
  //         })
  //       }
  //     }
  //     console.log(toc)
  //     this.toc.list = toc
  //   },
  //   handleListScroll(event) {
  //     // console.log(event.target.scrollTop)
  //   },
  // },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  display: flex;
  gap: 18px;
  height: 100%;
  box-sizing: border-box;
  padding: 20px 22px 22px;
  background:
    radial-gradient(circle at top left, var(--color-primary-light-300-alpha-800), transparent 34%),
    linear-gradient(180deg, var(--color-main-background), var(--color-main-background));
}

.sidebar {
  flex: 0 0 212px;
  min-height: 0;
}

.sidebarCard,
.panel {
  min-height: 0;
  height: 100%;
  border-radius: 22px;
  border: 1px solid rgba(226, 226, 229, 0.96);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(18px);
}

.sidebarCard {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toc {
  flex: 1 1 auto;
  min-height: 0;
  padding: 16px 8px 14px;
}

.tocH2 {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  line-height: 1.4;
  .mixin-ellipsis-1();
  font-size: var(--ui-font-body);
  font-weight: 500;
  color: var(--ui-text-secondary);
  padding: 11px 12px 11px 30px;
  border-radius: 13px;
  transition: @transition-fast;
  transition-property: background-color, color, transform;

  &:not(.active) {
    cursor: pointer;

    &:hover {
      transform: translateX(1px);
      background-color: rgba(0, 0, 0, 0.035);
      color: var(--ui-text-primary);
    }
  }

  &.active {
    color: var(--ui-text-accent);
    font-weight: 600;
    background: var(--color-primary-alpha-900);
  }
}

.activeIcon {
  position: absolute;
  left: 12px;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  transform: translateY(-50%);
  color: inherit;
}

.panel {
  flex: 1 1 auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.setting {
  flex: 1 1 auto;
  min-height: 0;
  padding: 26px 22px 24px;
  font-size: var(--ui-font-body);
  color: var(--ui-text-primary);
  box-sizing: border-box;
  overflow-y: auto;
  position: relative;
}

.settingList {
  padding: 0 8px 8px;

  :global {
    dt {
      margin: 0 0 18px;
      padding: 0;
      border-left: none;
      font-size: var(--ui-font-title);
      font-weight: 700;
      line-height: 1.15;
      color: var(--ui-text-primary);
    }

    dd {
      margin: 0 0 14px;
      padding: 18px 20px;
      border-radius: 16px;
      border: 1px solid rgba(228, 228, 232, 0.98);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 248, 250, 0.98));
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);

      >div {
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 18px;
        font-size: var(--ui-font-body);
        color: var(--ui-text-primary);
      }
    }

    h3 {
      margin: 0 0 14px;
      font-size: var(--ui-font-section);
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--ui-text-secondary);
    }

    .p {
      width: 100%;
      padding: 0;
      line-height: var(--ui-line-body);
      font-size: var(--ui-font-caption);
      color: var(--ui-text-tertiary);

      .btn {
        +.btn {
          margin-left: 12px;
        }
      }
    }

    .help-btn {
      padding: 0;
      margin: 0 0.35em;
      border: none;
      background: none;
      color: var(--ui-text-tertiary);
      cursor: pointer;
      transition: opacity 0.2s ease;

      &:hover {
        opacity: 0.7;
      }

      .help-icon {
        margin-left: 0;
      }
    }

    .help-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      margin-left: 5px;
      padding: 1px;
      border-radius: 999px;
      box-sizing: border-box;
      vertical-align: -0.18em;
      color: var(--ui-text-tertiary);
      background: rgba(15, 23, 42, 0.04);
      border: 1px solid rgba(226, 228, 232, 0.94);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
      cursor: help;
      transition: @transition-fast;
      transition-property: color, background-color, border-color, transform, box-shadow;

      &:hover {
        color: var(--ui-text-accent);
        background: var(--color-primary-alpha-900);
        border-color: rgba(255, 255, 255, 0.24);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.18),
          0 8px 16px rgba(15, 23, 42, 0.08);
        transform: scale(1.04);
      }
    }

    .row-help-icon {
      margin-left: -12px;
    }
  }
}

@media (max-width: 1080px) {
  .main {
    gap: 18px;
    padding: 18px;
  }

  .sidebar {
    flex-basis: 194px;
  }

  .setting {
    padding: 22px 18px 18px;
  }
}
</style>
