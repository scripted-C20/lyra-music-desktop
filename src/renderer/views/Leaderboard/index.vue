<template>
  <div :class="$style.leaderboard">
    <div :class="$style.lists">
      <div :class="$style.listsToolbar">
        <button
:class="$style.playBtn" :aria-label="$t('list__play')" :title="$t('list__play')"
          :disabled="!boardId" @click="handlePlayCurrentBoard"
>
          <line-icon :icon="Play" :size="16" />
        </button>
        <div :class="$style.listsSelect">
          <base-selection :model-value="source" :class="$style.select" :list="sourceList" item-key="id" item-name="name" @update:model-value="handleToggleSource" />
        </div>
      </div>
      <BoardList ref="boardListRef" :board-id="boardId" :source="source" @show-menu="$refs.musicListRef?.hideMenu()" />
    </div>
    <div :class="$style.list">
      <MusicList ref="musicListRef" :source="source" :board-id="boardId" @show-menu="$refs.boardListRef?.hideMenu()" />
    </div>
  </div>
</template>

<script>
import { Play } from 'lucide-vue-next'

import { computed, ref } from '@common/utils/vueTools'
import { getLeaderboardSetting, setLeaderboardSetting } from '@renderer/utils/data'
import BoardList from './BoardList/index.vue'
import MusicList from './MusicList/index.vue'
import { sources } from '@renderer/store/leaderboard/state'
import { sourceNames } from '@renderer/store'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { playSongListDetail } from './action'


const source = ref('')
const boardId = ref(null)

const verifyQueryParams = async function(to, from, next) {
  let _source = to.query.source
  let _boardId = to.query.boardId

  if (_source == null) {
    const setting = await getLeaderboardSetting()
    if (_source == null) {
      _source = setting.source
      _boardId = setting.boardId
    }
    next({
      path: to.path,
      query: { ...to.query, source: _source, boardId: _boardId },
    })
    return
  }
  next()
  source.value = _source
  boardId.value = _boardId
  void setLeaderboardSetting({ source: _source, boardId: _boardId })
}


export default {
  components: {
    BoardList,
    MusicList,
  },
  beforeRouteEnter: verifyQueryParams,
  beforeRouteUpdate: verifyQueryParams,
  setup() {
    const musicListRef = ref(null)
    const boardListRef = ref(null)
    const sourceList = computed(() => {
      return sources.map(s => ({ id: s, name: sourceNames.value[s] }))
    })
    const router = useRouter()
    const route = useRoute()
    const handleToggleSource = (id) => {
      void router.replace({
        path: route.path,
        query: {
          source: id,
        },
      })
    }

    const handlePlayCurrentBoard = () => {
      if (!boardId.value) return
      void playSongListDetail(boardId.value)
    }

    return {
      source,
      boardId,
      sourceList,
      handleToggleSource,
      handlePlayCurrentBoard,
      musicListRef,
      boardListRef,
      Play,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.leaderboard {
  height: 100%;
  display: flex;
  position: relative;
}
.header {
  flex: none;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;

}
.tab {
  flex: auto;
}
.select {
  flex: none;
  width: 100%;
}
.content {
  flex: auto;
  display: flex;
  overflow: hidden;
  flex-flow: column nowrap;
}

.lists {
  flex: none;
  width: clamp(176px, 15.6%, 214px);
  min-width: 176px;
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
}

.listsToolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 6px;
  padding-bottom: 6px;
  border-bottom: var(--color-list-header-border-bottom);
}

.playBtn {
  flex: none;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(215, 215, 222, 0.96);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 246, 248, 0.98));
  color: var(--ncm-red);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition: @transition-fast;
  transition-property: color, border-color, background-color, transform, opacity;

  &:hover:not([disabled]) {
    color: #fff;
    border-color: rgba(198, 47, 47, 0.32);
    background: linear-gradient(180deg, rgb(214, 68, 68), rgb(186, 39, 39));
    transform: translateY(-1px);
  }

  &:active:not([disabled]) {
    transform: translateY(0);
  }

  &[disabled] {
    opacity: .38;
    cursor: default;
  }
}

.listsHeader {
  position: relative;
}

.listsSelect {
  font-size: var(--ui-font-caption);
  flex: auto;
  padding-right: 0;
  position: relative;
  z-index: 3;

  >:global(.content) {
    display: block;
    width: 100%;
    --selection-width: 100%;
  }
  :global(.label-content) {
    min-height: 38px;
    width: 100%;
    padding: 0 14px;
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 246, 248, 0.98)) !important;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
    &:hover {
      color: var(--ui-text-accent);
    }
  }
  :global(.label) {
    color: var(--ui-text-primary) !important;
  }
  :global(.icon) {
    transition: opacity .3s ease;
  }

  :global(.selection-list) {
    width: 100%;
    min-width: 0;
    max-height: 360px;
    li {
      min-height: 40px;
      justify-content: flex-start;
      padding: 8px 14px;
      font-size: var(--ui-font-body);
    }
  }
  flex: none;
}

.list {
  position: relative;
  overflow: hidden;
  height: 100%;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
  // .noItem {

  // }
}

</style>
