<template>
  <div ref="dom_lists" :class="$style.lists">
    <div :class="$style.listHeader">
      <h2 :class="$style.listsTitle">{{ $t('my_list') }}</h2>
      <div :class="$style.headerBtns">
        <button
:class="[$style.listsAdd, $style.listsPlayBtn]" :aria-label="$t('list__play')" :title="$t('list__play')"
          :disabled="!canPlayCurrentList" @click="handlePlayCurrentList"
>
          <line-icon :icon="Play" :size="15" />
        </button>
        <button :class="$style.listsAdd" :aria-label="$t('lists__new_list_btn')" @click="isShowNewList = true">
          <line-icon :icon="ListPlus" :size="16" />
        </button>
        <button
:class="$style.listsAdd" :aria-label="$t('list_update_modal__title')"
          @click="isShowListUpdateModal = true"
>
          <line-icon :icon="RefreshCw" style="transform: rotate(45deg);" :size="16" />
        </button>
      </div>
    </div>
    <ul ref="dom_lists_list" class="scroll" :class="[$style.listsContent, { [$style.sortable]: isModDown }]">
      <li
class="default-list"
        :class="[$style.listsItem, { [$style.active]: defaultList.id == listId }, { [$style.clicked]: rightClickItemIndex == -2 }, { [$style.fetching]: fetchingListStatus[defaultList.id] }]"
        :aria-label="$t(defaultList.name)" :aria-selected="defaultList.id == listId"
        @contextmenu="handleListsItemRigthClick($event, -2)" @click="handleListToggle(defaultList.id)"
>
        <span :class="$style.listsLabel">
          <line-icon v-if="defaultList.id == listId" :icon="ChevronRight" :class="$style.activeIcon" />
          {{ $t(defaultList.name) }}
        </span>
      </li>
      <li
class="default-list"
        :class="[$style.listsItem, { [$style.active]: loveList.id == listId }, { [$style.clicked]: rightClickItemIndex == -1 }, { [$style.fetching]: fetchingListStatus[loveList.id] }]"
        :aria-label="$t(loveList.name)" :aria-selected="loveList.id == listId"
        @contextmenu="handleListsItemRigthClick($event, -1)" @click="handleListToggle(loveList.id)"
>
        <span :class="$style.listsLabel">
          <line-icon v-if="loveList.id == listId" :icon="ChevronRight" :class="$style.activeIcon" />
          {{ $t(loveList.name) }}
        </span>
      </li>
      <li
v-for="(item, index) in userLists" :key="item.id" class="user-list"
        :class="[$style.listsItem, { [$style.active]: item.id == listId }, { [$style.clicked]: rightClickItemIndex == index }, { [$style.fetching]: fetchingListStatus[item.id] }]"
        :data-index="index" :aria-label="item.name" :aria-selected="defaultList.id == listId"
        @contextmenu="handleListsItemRigthClick($event, index)"
>
        <span :class="$style.listsLabel" @click="handleListToggle(item.id, index + 2)">
          <line-icon v-if="item.id == listId" :icon="ChevronRight" :class="$style.activeIcon" />
          {{ item.name }}
        </span>
        <base-input
:class="$style.listsInput" type="text" :value="item.name" :placeholder="item.name"
          @keyup.enter="handleSaveListName(index, $event)" @blur="handleSaveListName(index, $event)"
/>
      </li>
      <transition
enter-active-class="animated-fast slideInLeft" leave-active-class="animated-fast fadeOut"
        @after-leave="isNewListLeave = false" @after-enter="$refs.dom_listsNewInput.focus()"
>
        <li v-if="isShowNewList" :class="[$style.listsItem, $style.listsNew, { [$style.newLeave]: isNewListLeave }]">
          <base-input
ref="dom_listsNewInput" :class="$style.listsInput" type="text"
            :placeholder="$t('lists__new_list_input')" @keyup.enter="handleCreateList" @blur="handleCreateList"
/>
        </li>
      </transition>
    </ul>
    <base-menu v-model="isShowMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
    <DuplicateMusicModal v-model:visible="isShowDuplicateMusicModal" :list-info="duplicateListInfo" />
    <ListSortModal v-model:visible="isShowListSortModal" :list-info="sortListInfo" />
    <ListUpdateModal v-model:visible="isShowListUpdateModal" />
  </div>
</template>

<script>
import { ListPlus, Play, RefreshCw, ChevronRight } from 'lucide-vue-next'

import { openUrl } from '@common/utils/electron'

import musicSdk from '@renderer/utils/musicSdk'
import DuplicateMusicModal from './components/DuplicateMusicModal.vue'
import ListSortModal from './components/ListSortModal.vue'
import ListUpdateModal from './components/ListUpdateModal.vue'

import { defaultList, loveList, userLists, fetchingListStatus } from '@renderer/store/list/state'
import { getListMusics, getListMusicsFromCache, removeUserList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player/action'

import { computed, onBeforeUnmount, ref, watch } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { LIST_IDS } from '@common/constants'

import { dialog } from '@renderer/plugins/Dialog'

import { saveListPrevSelectId } from '@renderer/utils/data'

import { useI18n } from '@renderer/plugins/i18n'


import useShare from './useShare'
import useMenu from './useMenu'
import useListUpdate from './useListUpdate'
import useSort from './useSort'
import useDarg from './useDarg'
import useEditList from './useEditList'
import useListScroll from './useListScroll'
import useDuplicate from './useDuplicate'

export default {
  name: 'MyLists',
  components: {
    DuplicateMusicModal,
    ListSortModal,
    ListUpdateModal,
  },
  props: {
    listId: {
      type: String,
      required: true,
    },
  },
  emits: ['show-menu'],
  setup(props, { emit }) {
    const router = useRouter()
    const t = useI18n()

    const dom_lists_list = ref(null)
    const rightClickItemIndex = ref(-10)
    const currentListLength = ref(0)

    const { handleImportList, handleExportList } = useShare()
    const { isShowListUpdateModal, handleUpdateSourceList } = useListUpdate()
    const { isShowListSortModal, sortListInfo, handleSortList } = useSort()
    const { isShowDuplicateMusicModal, duplicateListInfo, handleDuplicateList } = useDuplicate()
    const { handleRename, handleSaveListName, isShowNewList, isNewListLeave, handleCreateList } = useEditList({ dom_lists_list })
    useListScroll({ dom_lists_list })

    const handleOpenSourceDetailPage = async(listInfo) => {
      const { source, sourceListId } = listInfo
      if (!sourceListId) return
      let url
      if (/board__/.test(sourceListId)) {
        const id = sourceListId.replace(/board__/, '')
        url = musicSdk[source].leaderboard.getDetailPageUrl(id)
      } else if (musicSdk[source]?.songList?.getDetailPageUrl) {
        url = await musicSdk[source].songList.getDetailPageUrl(sourceListId)
      }
      if (!url) return
      void openUrl(url)
    }

    const handleRemove = (listInfo) => {
      void dialog.confirm({
        message: t('lists__remove_tip', { name: listInfo.name }),
        confirmButtonText: t('lists__remove_tip_button'),
      }).then(isRemove => {
        if (!isRemove) return
        void removeUserList([listInfo.id])
        if (props.listId == listInfo.id) {
          handleListToggle(LIST_IDS.DEFAULT)
        }
      })
    }

    const {
      menus,
      menuLocation,
      isShowMenu,
      showMenu,
      menuClick,
    } = useMenu({
      emit,

      handleImportList,
      handleExportList,
      handleUpdateSourceList,
      handleOpenSourceDetailPage,
      handleSortList,
      handleDuplicateList,
      handleRename,
      handleRemove,
    })

    const handleListsItemRigthClick = (event, index) => {
      rightClickItemIndex.value = index
      showMenu(event, index)
    }

    const syncCurrentListLength = async(listId) => {
      if (!listId) {
        currentListLength.value = 0
        return
      }
      const cachedList = getListMusicsFromCache(listId)
      if (cachedList.length) {
        currentListLength.value = cachedList.length
        return
      }
      const list = await getListMusics(listId)
      if (listId != props.listId) return
      currentListLength.value = list.length
    }

    const canPlayCurrentList = computed(() => {
      return !!props.listId && !fetchingListStatus[props.listId] && currentListLength.value > 0
    })

    const handlePlayCurrentList = async() => {
      if (!props.listId || fetchingListStatus[props.listId]) return
      let list = getListMusicsFromCache(props.listId)
      if (!list.length) list = await getListMusics(props.listId)
      currentListLength.value = list.length
      if (!list.length) return
      playList(props.listId, 0)
    }

    const handleListToggle = (id) => {
      if (id == props.listId) return
      router.replace({
        path: '/list',
        query: { id },
      }).catch(_ => _)
    }

    const handleMenuClick = (action) => {
      if (rightClickItemIndex.value < -2) return
      let index = rightClickItemIndex.value
      rightClickItemIndex.value = -10
      menuClick(action, index)
    }

    const { isModDown } = useDarg({ dom_lists_list, handleMenuClick, handleSaveListName })


    watch(() => props.listId, (listId) => {
      saveListPrevSelectId(listId)
      void syncCurrentListLength(listId)
    }, {
      immediate: true,
    })

    watch(() => userLists, (lists) => {
      if (lists.some(l => l.id == props.listId)) return
      void router.replace({
        path: '/list',
        query: {
          id: defaultList.id,
        },
      })
    })

    const handleMyListUpdate = (ids) => {
      if (!ids.includes(props.listId)) return
      void syncCurrentListLength(props.listId)
    }

    window.app_event.on('myListUpdate', handleMyListUpdate)

    onBeforeUnmount(() => {
      window.app_event.off('myListUpdate', handleMyListUpdate)
    })

    return {
      rightClickItemIndex,
      defaultList,
      loveList,
      userLists,
      fetchingListStatus,
      dom_lists_list,
      isShowListUpdateModal,
      isShowListSortModal,
      sortListInfo,
      isShowDuplicateMusicModal,
      duplicateListInfo,
      handleSaveListName,
      isShowNewList,
      isNewListLeave,
      handleCreateList,
      handleListsItemRigthClick,
      isShowMenu,
      handleMenuClick,
      menus,
      menuLocation,
      handleListToggle,
      canPlayCurrentList,
      handlePlayCurrentList,
      isModDown,
      hideMenu: handleMenuClick,
      ListPlus,
      Play,
      RefreshCw,
      ChevronRight,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@lists-item-height: 36px;

.lists {
  flex: none;
  width: 230px;
  display: flex;
  flex-flow: column nowrap;
  border-radius: 12px;
  background: var(--ncm-surface-muted);
  border: 1px solid var(--ncm-divider);
  overflow: hidden;
}

.listHeader {
  position: relative;
  display: flex;
  flex-flow: row nowrap;
  border-bottom: var(--color-list-header-border-bottom);
  align-items: center;
  padding: 8px 10px 6px;

  &:hover {
    .listsAdd {
      opacity: 1;
    }
  }
}

.listsTitle {
  flex: auto;
  font-size: 11px;
  line-height: 1.2;
  padding: 0 6px;
  font-weight: 700;
  color: var(--ncm-text-faint);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  .mixin-ellipsis-1();
}

.headerBtns {
  flex: none;
  display: flex;
  gap: 2px;
}

.listsAdd {
  background: none;
  height: 28px;
  width: 28px;
  border: none;
  outline: none;
  border-radius: 8px;
  cursor: pointer;
  opacity: .3;
  transition: opacity @transition-normal;
  color: var(--color-button-font);

  svg {
    vertical-align: bottom;
  }

  &:active {
    opacity: .7 !important;
  }

  &:hover {
    opacity: .6 !important;
  }

  &[disabled] {
    cursor: default;
    opacity: .18 !important;
  }
}

.listsPlayBtn {
  color: var(--color-primary);
  background: rgba(198, 47, 47, 0.08);
  opacity: .88;

  &:hover:not([disabled]) {
    background: rgba(198, 47, 47, 0.14);
    opacity: 1 !important;
  }
}

.listsContent {
  flex: auto;
  min-width: 0;
  overflow-y: scroll !important;
  padding: 6px 8px 10px;

  &.sortable {
    * {
      -webkit-user-drag: element;
    }

    .listsItem {

      &:hover,
      &.active,
      &.selected,
      &.clicked {
        background-color: transparent !important;
      }

      &.dragingItem {
        background-color: var(--color-primary-background-hover) !important;
      }
    }
  }
}

.listsItem {
  position: relative;
  transition: .3s ease;
  transition-property: color, background-color, opacity;
  background-color: transparent;
  border-radius: 10px;

  &:not(.active) {
    &:hover {
      background-color: rgb(239, 239, 241);
      cursor: pointer;
    }
  }

  &.active {
    color: var(--color-font);
    background: rgb(233, 233, 236);
    font-weight: 600;
  }

  &.selected {
    background-color: var(--color-primary-font-active);
  }

  &.clicked {
    background-color: var(--color-primary-background-hover);
  }

  &.fetching {
    opacity: .5;
  }

  &.editing {
    padding: 0 10px;
    background-color: var(--color-primary-background-hover);

    .listsLabel {
      display: none;
    }

    .listsInput {
      display: block;
    }
  }
}

.activeIcon {
  position: absolute;
  left: 12px;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 11px;
  height: 11px;
  margin-left: 0;
  margin-right: 0;
  color: var(--color-primary);
  transform: translateY(-50%);
}

.listsLabel {
  display: block;
  position: relative;
  height: @lists-item-height;
  padding: 0 12px 0 28px;
  font-size: 13px;
  line-height: @lists-item-height;
  .mixin-ellipsis-1();
}

.listsInput {
  width: 100%;
  height: @lists-item-height;
  // border: none;
  padding: 0;
  // padding-bottom: 1px;
  line-height: @lists-item-height;
  background: none !important;
  border-radius: 0;
  // outline: none;
  font-size: 13px;
  display: none;
  // font-family: inherit;
}

.listsNew {
  padding: 0 12px;
  background-color: rgb(239, 239, 241) !important;

  .listsInput {
    display: block;
  }
}

.newLeave {
  margin-top: -@lists-item-height;
  z-index: -1;
}
</style>
