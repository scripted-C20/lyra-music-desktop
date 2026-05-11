<template>
  <div :class="$style.leaderboard">
    <div :class="$style.lists">
      <div :class="$style.listsToolbar">
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
import { computed, ref } from '@common/utils/vueTools'
import { getLeaderboardSetting, setLeaderboardSetting } from '@renderer/utils/data'
import BoardList from './BoardList/index.vue'
import MusicList from './MusicList/index.vue'
import { sources } from '@renderer/store/leaderboard/state'
import { sourceNames } from '@renderer/store'
import { useRoute, useRouter } from '@common/utils/vueRouter'


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

    return {
      source,
      boardId,
      sourceList,
      handleToggleSource,
      musicListRef,
      boardListRef,
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
  max-width: 100%;
  min-width: 0;
  --selection-width: 100%;
  font-size: var(--ui-font-caption);

  :global(.label-content) {
    min-height: 38px;
    width: 100%;
    padding: 0 12px;
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 246, 248, 0.98)) !important;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
    &:hover {
      color: var(--ui-text-accent);
      transform: none;
    }
  }
  :global(.label) {
    color: var(--ui-text-primary) !important;
  }
  :global(.icon) {
    transition: opacity .3s ease;
  }

  :global(.selection-list) {
    padding: 6px 4px;
    border-radius: 18px;
    max-height: 228px;
    li {
      min-height: 40px;
      justify-content: center;
      text-align: center;
      padding: 8px 10px;
      font-size: var(--ui-font-body);
    }
  }
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
  overflow: hidden;
}

.listsToolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px 6px;
  padding-bottom: 6px;
  border-bottom: var(--color-list-header-border-bottom);
}

.listsHeader {
  position: relative;
}

.listsSelect {
  width: 100%;
  max-width: 148px;
  min-width: 0;
  margin: 0 auto;
  position: relative;
  z-index: 8;
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
