<template>
  <div ref="dom_menu" :class="$style.menu">
    <section v-for="section in menus" :key="section.id" :class="$style.section">
      <h3 :class="$style.sectionTitle">{{ section.title }}</h3>
      <ul :class="$style.list" role="toolbar">
        <li v-for="item in section.items" :key="item.to" :class="$style.navItem" role="presentation">
          <router-link
:class="[$style.link, { [$style.active]: $route.meta.name == item.name }]" role="tab"
            :aria-selected="$route.meta.name == item.name" :to="item.to" :aria-label="item.tips"
>
            <line-icon :icon="item.icon" :size="item.size" />
            <span :class="$style.label">{{ item.tips }}</span>
          </router-link>
        </li>
      </ul>
    </section>
  </div>
</template>

<script lang="ts">
import { appSetting } from '@renderer/store/setting'
import { useI18n } from '@root/lang'
import { ref, computed } from '@common/utils/vueTools'
import { Search, DiscAlbum, BarChart2, Heart, Download, Settings } from 'lucide-vue-next'

export default {
  name: 'NavBar',
  setup() {
    const t = useI18n()
    const dom_menu = ref<HTMLElement>()

    const menus = computed(() => {
      const size = 18
      const menuList = [
        {
          to: '/search',
          tips: t('search'),
          icon: Search,
          size,
          name: 'Search',
          enable: true,
        },
        {
          to: '/songList/list',
          tips: t('song_list'),
          icon: DiscAlbum,
          size,
          name: 'SongList',
          enable: true,
        },
        {
          to: '/leaderboard',
          tips: t('leaderboard'),
          icon: BarChart2,
          size,
          name: 'Leaderboard',
          enable: true,
        },
        {
          to: '/list',
          tips: t('my_list'),
          icon: Heart,
          size,
          name: 'List',
          enable: true,
        },
        {
          to: '/download',
          tips: t('download'),
          icon: Download,
          size,
          enable: appSetting['download.enable'],
          name: 'Download',
        },
        {
          to: '/setting',
          tips: t('setting'),
          icon: Settings,
          size,
          enable: true,
          name: 'Setting',
          section: 'system',
        },
      ].filter(m => m.enable)

      return [
        {
          id: 'online',
          title: '在线音乐',
          items: menuList.filter(item => ['Search', 'SongList', 'Leaderboard'].includes(item.name)),
        },
        {
          id: 'library',
          title: '我的音乐',
          items: menuList.filter(item => ['List', 'Download'].includes(item.name)),
        },
        {
          id: 'system',
          title: '系统',
          items: menuList.filter(item => item.name == 'Setting'),
        },
      ].filter(section => section.items.length)
    })
    return {
      menus,
      dom_menu,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.menu {
  flex: auto;
  padding: 0 2px 10px;
  overflow-y: auto;
}

.section {
  padding: 10px 6px 8px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(247, 247, 249, 0.9));
  border: 1px solid rgba(229, 229, 232, 0.92);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.section+.section {
  margin-top: 12px;
}

.sectionTitle {
  padding: 0 12px 10px;
  font-size: var(--ui-font-meta);
  line-height: 1.2;
  color: var(--ui-text-tertiary);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.list {
  -webkit-app-region: no-drag;
  display: flex;
  flex-flow: column nowrap;
  gap: 6px;
}

.navItem {
  position: relative;
}

.link {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  transition: @transition-fast;
  transition-property: background-color, opacity, color, transform, box-shadow;
  color: var(--ui-text-secondary);
  cursor: pointer;
  text-align: left;
  outline: none;
  text-decoration: none;
  padding: 12px 14px;
  border-radius: 15px;

  svg {
    flex: none;
    opacity: .88;
  }

  &:before {
    .mixin-after();
    left: 1px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    background-color: var(--color-primary);
    border-radius: 999px;
    opacity: 0;
    transition: opacity @transition-fast;
  }

  &.active {
    color: var(--ui-text-primary);
    background: linear-gradient(180deg, var(--color-primary-alpha-900), var(--color-primary-light-300-alpha-800));
    font-weight: 600;
    box-shadow: inset 0 0 0 1px var(--color-primary-light-300-alpha-800);

    &:before {
      opacity: 1;
    }

    .label {
      color: var(--ui-text-primary);
    }
  }

  &:hover {
    color: var(--ui-text-primary);
    transform: translateX(1px);

    &:not(.active) {
      background-color: rgba(255, 255, 255, 0.82);
      box-shadow: inset 0 0 0 1px rgba(228, 228, 232, 0.86);
    }
  }

  &:active:not(.active) {
    background-color: rgba(239, 239, 242, 0.92);
    transform: translateX(0);
  }
}

.label {
  font-size: var(--ui-font-body);
  line-height: var(--ui-line-compact);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  opacity: 1;
  font-weight: 500;
}
</style>
