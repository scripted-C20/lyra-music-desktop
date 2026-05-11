<template>
  <div :class="[$style.songList, { [$style.withToolbar]: enableSearchBar }]">
    <div v-if="enableSearchBar" :class="$style.toolbar">
      <div :class="$style.searchBox">
        <line-icon :icon="Search" :size="16" :class="$style.searchIcon" />
        <input
          v-model.trim="listSearchText"
          :class="$style.searchInput"
          :placeholder="$t('list__search_current_placeholder')"
          @keydown.esc.prevent="clearSearch"
        >
        <button
          v-if="listSearchText"
          type="button"
          :class="$style.searchClearBtn"
          :aria-label="$t('list__search')"
          @click="clearSearch"
        >
          <line-icon :icon="CircleX" :size="16" />
        </button>
      </div>
      <div :class="$style.toolbarBtns">
        <span v-if="listSearchText" :class="$style.searchCount">{{ displayList.length }}/{{ list.length }}</span>
        <button
          v-if="showPlayCurrentBtn"
          type="button"
          :class="[$style.toolbarBtn, $style.toolbarPlayBtn]"
          :aria-label="$t('list__play')"
          :title="$t('list__play')"
          :disabled="!canPlayCurrentList"
          @click="handlePlayCurrentList"
        >
          <line-icon :icon="PlayIcon" :size="16" />
        </button>
        <button
          type="button"
          :class="$style.toolbarBtn"
          :aria-label="$t('list__locate_playing')"
          :title="$t('list__locate_playing')"
          :disabled="!canLocateCurrentPlaying"
          @click="handleLocateCurrentPlaying"
        >
          <line-icon :icon="LocateFixed" :size="16" />
        </button>
        <button
          type="button"
          :class="$style.toolbarBtn"
          :aria-label="$t('list__back_to_top')"
          :title="$t('list__back_to_top')"
          :disabled="!canScrollToTop"
          @click="scrollToTop"
        >
          <line-icon :icon="ArrowUp" :size="16" />
        </button>
      </div>
    </div>
    <div :class="$style.list">
      <div class="thead">
        <table>
          <thead>
            <tr v-if="actionButtonsVisible">
              <th class="num" style="width: 5%;">#</th>
              <th class="nobreak">{{ $t('music_name') }}</th>
              <th class="nobreak" style="width: 22%;">{{ $t('music_singer') }}</th>
              <th class="nobreak" style="width: 22%;">{{ $t('music_album') }}</th>
              <th class="nobreak" style="width: 9%;">{{ $t('music_time') }}</th>
              <th class="nobreak" style="width: 16%;">{{ $t('action') }}</th>
            </tr>
            <tr v-else>
              <th class="num" style="width: 5%;">#</th>
              <th class="nobreak">{{ $t('music_name') }}</th>
              <th class="nobreak" style="width: 24%;">{{ $t('music_singer') }}</th>
              <th class="nobreak" style="width: 27%;">{{ $t('music_album') }}</th>
              <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
            </tr>
          </thead>
        </table>
      </div>
      <div :class="$style.content">
        <div v-show="displayList.length" ref="dom_listContent" :class="$style.content">
          <base-virtualized-list
            v-if="actionButtonsVisible"
            ref="listRef"
            :list="displayList"
            key-name="key"
            :item-height="listItemHeight"
            container-class="scroll"
            content-class="list"
            @scroll="handleListScroll"
            @contextmenu.capture="handleListRightClick"
          >
            <template #default="{ item: entry }">
              <div
                class="list-item"
                :class="[{ selected: rightClickSelectedIndex == entry.rawIndex }, { active: selectedList.includes(entry.musicInfo) }]"
                @click="handleListItemClick($event, entry.rawIndex)"
                @contextmenu="handleListItemRightClick($event, entry.rawIndex)"
              >
                <div class="list-item-cell no-select num" style="flex: 0 0 5%;" @click.stop>{{ entry.rawIndex + 1 }}</div>
                <div class="list-item-cell auto name">
                  <span class="select name" :aria-label="entry.musicInfo.name">{{ entry.musicInfo.name }}</span>
                  <span v-if="entry.musicInfo.meta._qualitys.flac24bit" class="no-select badge badge-theme-primary">{{ $t('tag__lossless_24bit') }}</span>
                  <span v-else-if="entry.musicInfo.meta._qualitys.ape || entry.musicInfo.meta._qualitys.flac || entry.musicInfo.meta._qualitys.wav" class="no-select badge badge-theme-primary">{{ $t('tag__lossless') }}</span>
                  <span v-else-if="entry.musicInfo.meta._qualitys['320k']" class="no-select badge badge-theme-secondary">{{ $t('tag__high_quality') }}</span>
                  <span v-if="sourceTag" class="no-select badge badge-theme-tertiary">{{ entry.musicInfo.source }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="entry.musicInfo.singer">{{ entry.musicInfo.singer }}</span></div>
                <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="entry.musicInfo.meta.albumName">{{ entry.musicInfo.meta.albumName }}</span></div>
                <div class="list-item-cell" style="flex: 0 0 9%;"><span class="no-select">{{ entry.musicInfo.interval || '--/--' }}</span></div>
                <div class="list-item-cell" style="flex: 0 0 16%; padding-left: 0; padding-right: 0;">
                  <material-list-buttons
                    :index="entry.rawIndex"
                    :remove-btn="false"
                    :download-btn="assertApiSupport(entry.musicInfo.source)"
                    :play-btn="checkApiSource ? assertApiSupport(entry.musicInfo.source) : true"
                    @btn-click="handleListBtnClick"
                  />
                </div>
              </div>
            </template>
            <template #footer>
              <div :class="$style.pagination">
                <material-pagination :count="total" :limit="limit" :page="page" @btn-click="$emit('togglePage', $event)" />
              </div>
            </template>
          </base-virtualized-list>
          <base-virtualized-list
            v-else
            ref="listRef"
            :list="displayList"
            key-name="key"
            :item-height="listItemHeight"
            container-class="scroll"
            content-class="list"
            @scroll="handleListScroll"
            @contextmenu.capture="handleListRightClick"
          >
            <template #default="{ item: entry }">
              <div
                class="list-item"
                :class="[{ selected: rightClickSelectedIndex == entry.rawIndex }, { active: selectedList.includes(entry.musicInfo) }]"
                @click="handleListItemClick($event, entry.rawIndex)"
                @contextmenu="handleListItemRightClick($event, entry.rawIndex)"
              >
                <div class="list-item-cell no-select num" style="flex: 0 0 5%;" @click.stop>{{ entry.rawIndex + 1 }}</div>
                <div class="list-item-cell auto name">
                  <span class="select name" :aria-label="entry.musicInfo.name">{{ entry.musicInfo.name }}</span>
                  <span v-if="entry.musicInfo.meta._qualitys.flac24bit" class="no-select badge badge-theme-primary">{{ $t('tag__lossless_24bit') }}</span>
                  <span v-else-if="entry.musicInfo.meta._qualitys.ape || entry.musicInfo.meta._qualitys.flac || entry.musicInfo.meta._qualitys.wav" class="no-select badge badge-theme-primary">{{ $t('tag__lossless') }}</span>
                  <span v-else-if="entry.musicInfo.meta._qualitys['320k']" class="no-select badge badge-theme-secondary">{{ $t('tag__high_quality') }}</span>
                  <span v-if="sourceTag" class="no-select badge badge-theme-tertiary">{{ entry.musicInfo.source }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 24%;"><span class="select" :aria-label="entry.musicInfo.singer">{{ entry.musicInfo.singer }}</span></div>
                <div class="list-item-cell" style="flex: 0 0 27%;"><span class="select" :aria-label="entry.musicInfo.meta.albumName">{{ entry.musicInfo.meta.albumName }}</span></div>
                <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ entry.musicInfo.interval || '--/--' }}</span></div>
              </div>
            </template>
            <template #footer>
              <div :class="$style.pagination">
                <material-pagination :count="total" :limit="limit" :page="page" @btn-click="$emit('togglePage', $event)" />
              </div>
            </template>
          </base-virtualized-list>
        </div>
        <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
          <div v-show="!displayList.length" :class="$style.noitem">
            <p v-text="list.length ? $t('list__search_no_result') : noItem" />
          </div>
        </transition>
      </div>
    </div>
    <common-list-add-modal v-model:show="isShowListAdd" :music-info="selectedAddMusicInfo" teleport="#view" />
    <common-list-add-multiple-modal v-model:show="isShowListAddMultiple" :music-list="selectedList" teleport="#view" @confirm="removeAllSelect" />
    <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" @confirm="removeAllSelect" />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
  </div>
</template>

<script>
import { ArrowUp, CircleX, LocateFixed, Play as PlayIcon, Search } from 'lucide-vue-next'

import { clipboardWriteText } from '@common/utils/electron'
import { computed, nextTick, ref, watch } from '@common/utils/vueTools'
import { playMusicInfo } from '@renderer/store/player/state'
import { assertApiSupport } from '@renderer/store/utils'
import { appSetting } from '@renderer/store/setting'
import useList from './useList'
import useMenu from './useMenu'
import usePlay from './usePlay'
import useMusicDownload from './useMusicDownload'
import useMusicAdd from './useMusicAdd'
import useMusicActions from './useMusicActions'

export default {
  name: 'MaterialOnlineList',
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    page: {
      type: Number,
      required: true,
    },
    limit: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    sourceTag: {
      type: Boolean,
      default: false,
    },
    noItem: {
      type: String,
      default: '',
    },
    checkApiSource: {
      type: Boolean,
      default: false,
    },
    enableSearchBar: {
      type: Boolean,
      default: false,
    },
    showPlayCurrentBtn: {
      type: Boolean,
      default: false,
    },
    currentListId: {
      type: String,
      default: '',
    },
  },
  emits: ['show-menu', 'play-list', 'togglePage'],
  setup(props, { emit }) {
    const actionButtonsVisible = appSetting['list.actionButtonsVisible']
    const rightClickSelectedIndex = ref(-1)
    const dom_listContent = ref(null)
    const listRef = ref(null)
    const listSearchText = ref('')
    const isShowBackToTop = ref(false)

    const {
      selectedList,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ props, listRef })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      doubleClickPlay,
    } = usePlay({ selectedList, props, removeAllSelect, emit })

    const {
      isShowListAdd,
      isShowListAddMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
    } = useMusicAdd({ selectedList, props })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, props })

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleDislikeMusic,
    } = useMusicActions({ props })

    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      menuClick,
    } = useMenu({
      props,
      assertApiSupport,
      emit,

      handleShowDownloadModal,
      handlePlayMusic,
      handlePlayMusicLater,
      handleSearch,
      handleShowMusicAddModal,
      handleOpenMusicDetail,
      handleDislikeMusic,
    })

    const displayList = computed(() => {
      const keyword = listSearchText.value.trim().toLowerCase()
      return props.list.reduce((result, musicInfo, index) => {
        if (keyword) {
          const searchValue = `${musicInfo.name ?? ''}\n${musicInfo.singer ?? ''}\n${musicInfo.meta?.albumName ?? ''}\n${musicInfo.source ?? ''}`.toLowerCase()
          if (!searchValue.includes(keyword)) return result
        }
        result.push({
          key: `${musicInfo.id}_${index}`,
          rawIndex: index,
          musicInfo,
        })
        return result
      }, [])
    })
    const canPlayCurrentList = computed(() => displayList.value.length > 0)
    const canScrollToTop = computed(() => isShowBackToTop.value)
    const currentPlayingRawIndex = computed(() => {
      if (!props.currentListId || playMusicInfo.listId !== props.currentListId) return -1
      const currentMusic = playMusicInfo.musicInfo
      if (!currentMusic) return -1
      const currentMusicId = 'progress' in currentMusic ? currentMusic.metadata.musicInfo.id : currentMusic.id
      return props.list.findIndex(item => item.id === currentMusicId)
    })
    const canLocateCurrentPlaying = computed(() => currentPlayingRawIndex.value > -1)

    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, props.list[index], index)
    }
    const handleMenuClick = (action) => {
      const index = rightClickSelectedIndex.value
      rightClickSelectedIndex.value = -1
      menuClick(action, index)
    }
    const hideMenu = () => {
      rightClickSelectedIndex.value = -1
      isShowItemMenu.value = false
    }
    const handleListRightClick = (event) => {
      if (!event.target.classList.contains('select')) return
      event.stopImmediatePropagation()
      const classList = dom_listContent.value.classList
      classList.add('copying')
      window.requestAnimationFrame(() => {
        let str = window.getSelection().toString()
        classList.remove('copying')
        str = str.split(/\n\n/).map(s => s.replace(/\n/g, '  ')).join('\n').trim()
        if (!str.length) return
        clipboardWriteText(str)
      })
    }
    const handleListBtnClick = ({ action, index }) => {
      switch (action) {
        case 'download':
          handleShowDownloadModal(index, true)
          break
        case 'play':
          void handlePlayMusic(index, true)
          break
        case 'search':
          handleSearch(index)
          break
        case 'listAdd':
          handleShowMusicAddModal(index, true)
          break
      }
    }
    const clearSearch = () => {
      if (!listSearchText.value) return
      listSearchText.value = ''
    }
    const handlePlayCurrentList = () => {
      const targetMusic = displayList.value[0]
      if (!targetMusic) return
      emit('play-list', targetMusic.rawIndex)
    }
    const getDisplayIndexByRawIndex = (rawIndex) => {
      return displayList.value.findIndex(item => item.rawIndex === rawIndex)
    }
    const handleLocateCurrentPlaying = async() => {
      const rawIndex = currentPlayingRawIndex.value
      if (rawIndex < 0) return
      if (listSearchText.value && getDisplayIndexByRawIndex(rawIndex) < 0) {
        listSearchText.value = ''
        await nextTick()
      }
      const displayIndex = getDisplayIndexByRawIndex(rawIndex)
      if (displayIndex < 0) return
      listRef.value.scrollToIndex(displayIndex, -150, true)
    }
    const handleListScroll = (event) => {
      const scrollTop = event?.target?.scrollTop ?? listRef.value?.getScrollTop?.() ?? 0
      isShowBackToTop.value = scrollTop > Math.max(listItemHeight.value * 4, 180)
    }
    const scrollToTop = () => {
      isShowBackToTop.value = false
      void listRef.value?.scrollTo?.(0, true)
    }

    watch(listSearchText, () => {
      isShowBackToTop.value = false
      void nextTick(() => {
        void listRef.value?.scrollTo?.(0)
      })
    })

    return {
      listItemHeight,
      handleListItemClick,
      selectedList,
      handleListItemRightClick,
      removeAllSelect,
      handleListBtnClick,
      rightClickSelectedIndex,
      dom_listContent,
      listRef,

      menus,
      isShowItemMenu,
      menuLocation,
      handleMenuClick,
      hideMenu,

      handleListRightClick,
      assertApiSupport,

      isShowListAdd,
      isShowListAddMultiple,
      selectedAddMusicInfo,

      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,

      listSearchText,
      displayList,
      clearSearch,
      handlePlayCurrentList,
      canPlayCurrentList,
      handleLocateCurrentPlaying,
      canLocateCurrentPlaying,
      handleListScroll,
      canScrollToTop,
      scrollToTop,
      actionButtonsVisible,
      ArrowUp,
      CircleX,
      LocateFixed,
      PlayIcon,
      Search,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.songList {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  border-radius: 18px;
  background: var(--ncm-surface);
  border: 1px solid var(--ncm-divider);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}

.withToolbar {
  gap: 0;
}

.toolbar {
  flex: none;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 16px 16px 10px;
}

.searchBox {
  flex: auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(244, 246, 248, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.searchIcon {
  flex: none;
  color: var(--ui-text-tertiary);
}

.searchInput {
  flex: auto;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ui-text-primary);
  font-size: var(--ui-font-body);

  &::placeholder {
    color: var(--ui-text-tertiary);
  }
}

.searchClearBtn,
.toolbarBtn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: .45;
    transform: none;
    box-shadow: none;
  }
}

.searchClearBtn {
  width: 26px;
  height: 26px;
  margin-right: -4px;
  border-radius: 999px;
  background: transparent;
  color: var(--ui-text-secondary);

  &:not(:disabled):hover {
    background: rgba(148, 163, 184, 0.14);
    color: var(--ui-text-primary);
  }
}

.toolbarBtns {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(243, 245, 247, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.searchCount {
  flex: none;
  padding: 0 12px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  border-radius: 12px;
  background: rgba(198, 47, 47, 0.08);
  color: var(--ui-text-accent);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.toolbarBtn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--ui-text-secondary);

  &:not(:disabled):hover {
    background: rgba(148, 163, 184, 0.18);
    color: var(--ui-text-primary);
    transform: translateY(-1px);
  }
}

.toolbarPlayBtn {
  background: linear-gradient(135deg, rgba(198, 47, 47, 0.92), rgba(224, 82, 82, 0.92));
  color: #fff;
  box-shadow: 0 8px 18px rgba(198, 47, 47, 0.18);

  &:not(:disabled):hover {
    background: linear-gradient(135deg, rgba(188, 37, 37, 0.96), rgba(218, 64, 64, 0.96));
    color: #fff;
    box-shadow: 0 10px 20px rgba(198, 47, 47, 0.22);
  }
}

.list {
  position: relative;
  width: 100%;
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  font-size: var(--ui-font-body);
}

.content {
  flex: auto;
  min-height: 0;
  position: relative;
  height: 100%;
}

.pagination {
  text-align: center;
  padding: 20px 0 18px;
}

.noitem {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;

  p {
    font-size: var(--ui-font-title);
    color: var(--ui-text-tertiary);
  }
}

@media (max-width: 780px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .toolbarBtns {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
