<template>
  <div :class="$style.list">
    <div :class="$style.toolbar">
      <div :class="$style.searchBox">
        <line-icon :icon="Search" :size="16" :class="$style.searchIcon" />
        <input
          ref="listSearchInput"
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
          type="button"
          :class="[$style.toolbarBtn, $style.toolbarPlayBtn]"
          :aria-label="$t('list__play')"
          :title="$t('list__play')"
          :disabled="!canPlayCurrentList"
          @click="handlePlayCurrentList"
        >
          <line-icon :icon="Play" :size="16" />
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
          :disabled="!isShowBackToTop || !displayList.length"
          @click="scrollToTop"
        >
          <line-icon :icon="ArrowUp" :size="16" />
        </button>
      </div>
    </div>
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
            <th class="nobreak" style="width: 25%;">{{ $t('music_singer') }}</th>
            <th class="nobreak" style="width: 28%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
          </tr>
        </thead>
      </table>
    </div>
    <div v-show="displayList.length" ref="dom_listContent" :class="$style.content">
      <base-virtualized-list
v-if="actionButtonsVisible" ref="listRef" v-slot="{ item: entry }" :list="displayList"
        key-name="key" :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="handleListScroll" @contextmenu.capture="handleListRightClick"
>
        <div
class="list-item"
          :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === entry.rawIndex }, { selected: selectedIndex == entry.rawIndex || rightClickSelectedIndex == entry.rawIndex }, { active: selectedList.includes(entry.musicInfo) }, { disabled: !assertApiSupport(entry.musicInfo.source) }]"
          @click="handleListItemClick($event, entry.rawIndex)" @contextmenu="handleListItemRightClick($event, entry.rawIndex)"
>
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === entry.rawIndex" :class="$style.playIcon">
                <line-icon :icon="Play" :size="18" />
              </div>
              <div v-else class="num">{{ entry.rawIndex + 1 }}</div>
            </transition>
          </div>
          <div class="list-item-cell auto name" :aria-label="entry.musicInfo.name">
            <span class="select name">{{ entry.musicInfo.name }}</span>
            <span v-if="isShowSource" class="no-select label-source">{{ entry.musicInfo.source }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="entry.musicInfo.singer">{{
            entry.musicInfo.singer }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="entry.musicInfo.meta.albumName">{{
            entry.musicInfo.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 9%;"><span class="no-select">{{ entry.musicInfo.interval || '--/--'
              }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 16%; padding-left: 0; padding-right: 0;">
            <material-list-buttons
:index="entry.rawIndex"
              :download-btn="assertApiSupport(entry.musicInfo.source) && entry.musicInfo.source != 'local'" @btn-click="handleListBtnClick"
/>
          </div>
        </div>
      </base-virtualized-list>
      <base-virtualized-list
v-else ref="listRef" v-slot="{ item: entry }" :list="displayList" key-name="key"
        :item-height="listItemHeight" container-class="scroll" content-class="list" @scroll="handleListScroll"
        @contextmenu.capture="handleListRightClick"
>
        <div
class="list-item"
          :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === entry.rawIndex }, { selected: selectedIndex == entry.rawIndex || rightClickSelectedIndex == entry.rawIndex }, { active: selectedList.includes(entry.musicInfo) }, { disabled: !assertApiSupport(entry.musicInfo.source) }]"
          @click="handleListItemClick($event, entry.rawIndex)" @contextmenu="handleListItemRightClick($event, entry.rawIndex)"
>
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === entry.rawIndex" :class="$style.playIcon">
                <line-icon :icon="Play" :size="18" />
              </div>
              <div v-else class="num">{{ entry.rawIndex + 1 }}</div>
            </transition>
          </div>
          <div class="list-item-cell auto name">
            <span class="select name" :aria-label="entry.musicInfo.name">{{ entry.musicInfo.name }}</span>
            <span v-if="isShowSource" class="no-select label-source">{{ entry.musicInfo.source }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 25%;"><span class="select" :aria-label="entry.musicInfo.singer">{{
            entry.musicInfo.singer }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 28%;"><span class="select" :aria-label="entry.musicInfo.meta.albumName">{{
            entry.musicInfo.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ entry.musicInfo.interval || '--/--'
              }}</span></div>
        </div>
      </base-virtualized-list>
    </div>
    <div v-show="!displayList.length" :class="$style.noItem">
      <p v-text="list.length ? $t('list__search_no_result') : $t('no_item')" />
    </div>
    <common-list-add-modal
v-model:show="isShowListAdd" :is-move="isMove" :from-list-id="listId"
      :music-info="selectedAddMusicInfo" :exclude-list-id="excludeListIds" teleport="#view"
/>
    <common-list-add-multiple-modal
v-model:show="isShowListAddMultiple" :from-list-id="listId"
      :is-move="isMoveMultiple" :music-list="selectedList" :exclude-list-id="excludeListIds" teleport="#view"
      @confirm="removeAllSelect"
/>
    <common-download-modal
v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view"
      :list-id="listId"
/>
    <common-download-multiple-modal
v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view"
      :list-id="listId" @confirm="removeAllSelect"
/>
    <music-sort-modal
v-model:show="isShowMusicSortModal" :music-info="selectedSortMusicInfo"
      :selected-num="selectedNum" @confirm="sortMusic"
/>
    <music-toggle-modal
v-model:show="isShowMusicToggleModal" :music-info="selectedToggleMusicInfo"
      @toggle="toggleSource"
/>
    <base-menu
v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name"
      @menu-click="handleMenuClick"
/>
  </div>
</template>

<script>
import { ArrowUp, CircleX, LocateFixed, Play, Search } from 'lucide-vue-next'

import { clipboardWriteText } from '@common/utils/electron'
import { computed, nextTick, onBeforeUnmount, ref, watch } from '@common/utils/vueTools'
import { assertApiSupport } from '@renderer/store/utils'
import MusicSortModal from './components/MusicSortModal.vue'
import MusicToggleModal from './components/MusicToggleModal.vue'
import useListInfo from './useListInfo'
import useList from './useList'
import useMenu from './useMenu'
import usePlay from './usePlay'
import useMusicDownload from './useMusicDownload'
import useMusicAdd from './useMusicAdd'
import useSort from './useSort'
import useMusicActions from './useMusicActions'
import useListScroll from './useListScroll'
import useMusicToggle from './useMusicToggle'
import { appSetting } from '@renderer/store/setting'
export default {
  name: 'MusicList',
  components: {
    MusicSortModal,
    MusicToggleModal,
  },
  props: {
    listId: {
      type: String,
      required: true,
    },
  },
  emits: ['show-menu'],
  setup(props, { emit }) {
    const actionButtonsVisible = appSetting['list.actionButtonsVisible']
    const listSearchInput = ref(null)
    const listSearchText = ref('')
    const isShowBackToTop = ref(false)

    let scrollIndex = null
    let isAnimation = false
    const handleRestoreScroll = (_scrollIndex, _isAnimation) => {
      scrollIndex = _scrollIndex
      isAnimation = _isAnimation
      if (isAnimation) void restoreScroll(scrollIndex, isAnimation)
      // console.log('handleRestoreScroll', scrollIndex, isAnimation)
    }
    const onLoadedList = () => {
      // console.log('restoreScroll', scrollIndex, isAnimation)
      void restoreScroll(scrollIndex, isAnimation)
    }

    const {
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      list,
      playerInfo,
      setSelectedIndex,
      isShowSource,
      excludeListIds,
    } = useListInfo({ props, onLoadedList })

    const {
      selectedList,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ listRef, list })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      doubleClickPlay,
    } = usePlay({ props, selectedList, list, removeAllSelect })

    const {
      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
    } = useMusicAdd({ selectedList, list })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, list })

    const {
      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      handleShowSortModal,
      sortMusic,
    } = useSort({ props, list, selectedList, removeAllSelect })

    const {
      handleShowMusicToggleModal,
      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    } = useMusicToggle(props, list)

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleRemoveMusic,
    } = useMusicActions({ props, list, removeAllSelect, selectedList })

    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      hideMenu,
      menuClick,
    } = useMenu({
      assertApiSupport,
      emit,

      handleShowDownloadModal,
      handlePlayMusic,
      handlePlayMusicLater,
      handleShowMusicToggleModal,
      handleSearch,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
      handleShowSortModal,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleRemoveMusic,
    })

    const { saveListPosition, restoreScroll } = useListScroll({
      props,
      listRef,
      list,
      handleRestoreScroll,
      shouldSavePosition: () => !listSearchText.value,
    })

    const displayList = computed(() => {
      const keyword = listSearchText.value.trim().toLowerCase()
      return list.value.reduce((result, musicInfo, index) => {
        if (keyword) {
          const searchText = `${musicInfo.name ?? ''}\n${musicInfo.singer ?? ''}\n${musicInfo.meta?.albumName ?? ''}\n${musicInfo.source ?? ''}`.toLowerCase()
          if (!searchText.includes(keyword)) return result
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
    const canLocateCurrentPlaying = computed(() => playerInfo.value.isPlayList && playerInfo.value.playIndex > -1)

    const focusSearchInput = () => {
      void nextTick(() => {
        listSearchInput.value?.focus()
      })
    }
    const clearSearch = () => {
      if (!listSearchText.value) return
      listSearchText.value = ''
      focusSearchInput()
    }
    const handlePlayCurrentList = () => {
      const targetMusic = displayList.value[0]
      if (!targetMusic) return
      handlePlayMusic(targetMusic.rawIndex)
    }
    const flashSelectedRow = (rawIndex) => {
      setSelectedIndex(rawIndex)
      setTimeout(() => {
        if (selectedIndex.value === rawIndex) setSelectedIndex(-1)
      }, 700)
    }
    const getDisplayIndexByRawIndex = (rawIndex) => {
      return displayList.value.findIndex(item => item.rawIndex === rawIndex)
    }
    const handleLocateCurrentPlaying = async() => {
      if (!canLocateCurrentPlaying.value) return
      const rawIndex = playerInfo.value.playIndex
      if (rawIndex < 0) return
      if (listSearchText.value && getDisplayIndexByRawIndex(rawIndex) < 0) {
        listSearchText.value = ''
        await nextTick()
      }
      const displayIndex = getDisplayIndexByRawIndex(rawIndex)
      if (displayIndex < 0) return
      listRef.value.scrollToIndex(displayIndex, -150, true, () => {
        flashSelectedRow(rawIndex)
      })
    }
    const handleListScroll = (event) => {
      if (!listSearchText.value) saveListPosition()
      const scrollTop = event?.target?.scrollTop ?? listRef.value?.getScrollTop?.() ?? 0
      isShowBackToTop.value = scrollTop > Math.max(listItemHeight.value * 4, 180)
    }
    const scrollToTop = () => {
      isShowBackToTop.value = false
      void listRef.value.scrollTo(0, true)
    }
    const handleFocusSearch = ({ event } = {}) => {
      event?.preventDefault?.()
      focusSearchInput()
    }

    watch(listSearchText, () => {
      isShowBackToTop.value = false
      void nextTick(() => {
        void listRef.value?.scrollTo?.(0)
      })
    })

    window.key_event.on('key_mod+f_down', handleFocusSearch)
    onBeforeUnmount(() => {
      window.key_event.off('key_mod+f_down', handleFocusSearch)
    })


    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, list.value[index], index)
    }
    const handleMenuClick = (action) => {
      let index = rightClickSelectedIndex.value
      rightClickSelectedIndex.value = -1
      menuClick(action, index)
    }
    const handleListRightClick = (event) => {
      if (!event.target.classList.contains('select')) return
      event.stopImmediatePropagation()
      let classList = dom_listContent.value.classList
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
          handlePlayMusic(index, true)
          break
        case 'search':
          handleSearch(index)
          break
        case 'listAdd':
          handleShowMusicAddModal(index, true)
          break
      }
    }
    return {
      listItemHeight,
      handleListItemClick,
      selectedList,
      handleListItemRightClick,
      removeAllSelect,
      handleListBtnClick,
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      excludeListIds,
      menus,
      isShowItemMenu,
      menuLocation,
      handleMenuClick,
      hideMenu,
      handleListRightClick,
      assertApiSupport,
      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,
      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      sortMusic,
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      listSearchInput,
      listSearchText,
      displayList,
      clearSearch,
      scrollToTop,
      saveListPosition,
      handleRestoreScroll,
      canPlayCurrentList,
      canLocateCurrentPlaying,
      handlePlayCurrentList,
      handleLocateCurrentPlaying,
      handleListScroll,
      isShowBackToTop,
      list,
      playerInfo,
      isShowSource,
      actionButtonsVisible,
      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
      ArrowUp,
      CircleX,
      LocateFixed,
      Play,
      Search,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  overflow: hidden;
  height: 100%;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  border-radius: 18px;
  background: var(--ncm-surface);
  border: 1px solid var(--ncm-divider);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);

  :global(.list-item) {
    &.active {
      color: var(--color-button-font);
    }
  }

  :global {
    .label-source {
      color: var(--ui-text-accent);
      padding: 4px 8px;
      font-size: var(--ui-font-meta);
      line-height: 1.2;
      opacity: .92;
      display: inline-block;
      border-radius: 999px;
      background: rgba(198, 47, 47, 0.08);
    }
  }
}

.toolbar {
  flex: none;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 16px 18px 10px;
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
    opacity: 0.45;
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

  &:disabled {
    background: rgba(148, 163, 184, 0.18);
    color: rgba(255, 255, 255, 0.9);
  }
}

.num {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.playIcon {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--color-button-font);
  opacity: .7;
}

.content {
  min-height: 0;
  font-size: var(--ui-font-body);
  display: flex;
  flex-flow: column nowrap;
  flex: auto;
  padding-bottom: 1px;
}

.noItem {
  position: relative;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;

  p {
    font-size: var(--ui-font-title);
    color: var(--ui-text-tertiary);
  }
}

@media (max-width: 720px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .toolbarBtns {
    width: 100%;
    justify-content: flex-end;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }
}
</style>
