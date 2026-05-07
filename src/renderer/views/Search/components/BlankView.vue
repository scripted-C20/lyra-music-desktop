<template>
  <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
    <div v-show="props.visible" :class="$style.noitem">
      <div v-if="appSetting['search.isShowHotSearch'] || (appSetting['search.isShowHistorySearch'] && historyList.length)" class="scroll" :class="$style.noitemListContainer">
        <dl v-if="appSetting['search.isShowHotSearch']" :class="[$style.noitemList, $style.noitemHotSearchList]">
          <dt :class="$style.noitemListTitle">{{ $t('search__hot_search') }}</dt>
          <dd :class="$style.noitemListBody">
            <span v-for="(item, index) in hotSearchList" :key="index" :class="$style.noitemListItem" @click="handleSearch(item)">{{ item }}</span>
          </dd>
        </dl>
        <dl v-if="appSetting['search.isShowHistorySearch'] && historyList.length" :class="$style.noitemList">
          <dt :class="$style.noitemListTitle">
            <span>{{ $t('history_search') }}</span><span :class="$style.historyClearBtn" :aria-label="$t('history_clear')" @click="clearHistoryList">
              <line-icon :icon="Eraser" :size="15" /></span>
          </dt>
          <dd :class="$style.noitemListBody">
            <span v-for="(item, index) in historyList" :key="index + item" :class="$style.noitemListItem" :aria-label="$t('history_remove')" @contextmenu="removeHistoryWord(index)" @click="handleSearch(item)">{{ item }}</span>
          </dd>
        </dl>
      </div>
      <div v-else :class="$style.noitemLabel">
        <div :class="$style.emptyCard">
          <div :class="$style.emptyIcon">
            <line-icon :icon="Search" :size="24" />
          </div>
          <p>{{ $t('search__welcome') }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { Eraser, Search } from 'lucide-vue-next'

import { watch, shallowRef } from '@common/utils/vueTools'
import { historyList } from '@renderer/store/search/state'
import { getHistoryList, removeHistoryWord, clearHistoryList } from '@renderer/store/search/action'
import { getList } from '@renderer/store/hotSearch'
import { appSetting } from '@renderer/store/setting'
import { useRouter } from '@common/utils/vueRouter'

const props = defineProps({
  visible: Boolean,
  source: {
    type: String,
    required: true,
  },
})

const hotSearchList = shallowRef([])

if (appSetting['search.isShowHotSearch']) {
  watch(() => props.visible, (visible) => {
    if (!visible) return
    void getList(props.source).then(list => {
      hotSearchList.value = list
    })
  }, {
    immediate: true,
  })

  watch(() => props.source, (source) => {
    if (!props.visible) return
    void getList(source).then(list => {
      if (source != props.source) return
      hotSearchList.value = list
    })
  })
}

if (appSetting['search.isShowHistorySearch']) {
  void getHistoryList()
}

const router = useRouter()
const handleSearch = (text) => {
  void router.replace({
    path: '/search',
    query: {
      text,
    },
  })
}

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.noitem {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-flow: column nowrap;
  background:
    radial-gradient(circle at top left, var(--color-primary-light-300-alpha-800), transparent 32%),
    linear-gradient(180deg, rgba(252, 252, 253, 0.94), rgba(246, 246, 248, 0.96));
}
.noitemListContainer {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
  min-height: 0;
  height: 100%;
  align-content: flex-start;
}
.noitemList {
  min-height: 0;
  padding: 18px 18px 16px;
  border-radius: @radius-card;
  border: 1px solid rgba(228, 228, 232, 0.98);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 247, 249, 0.98));
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.045);
}
.noitemHotSearchList {
  min-height: 180px;
}
.noitemListTitle {
  color: var(--ui-text-primary);
  padding: 0 0 14px;
  font-size: var(--ui-font-section);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.noitemListBody {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.noitemListItem {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(228, 228, 232, 0.96);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 246, 248, 0.98));
  transition: @transition-fast;
  transition-property: background-color, border-color, color, transform, box-shadow;
  cursor: pointer;
  color: var(--ui-text-secondary);
  .mixin-ellipsis-1();
  max-width: 180px;
  font-size: var(--ui-font-caption);
  font-weight: 500;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.035);
  &:hover {
    color: var(--ui-text-accent);
    border-color: var(--color-primary-light-100-alpha-400);
    background-color: rgba(255, 255, 255, 0.98);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
    background-color: rgba(241, 241, 244, 0.98);
  }
}
.historyClearBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--ui-text-tertiary);
  cursor: pointer;
  transition: @transition-normal;
  transition-property: color, opacity, background-color;
  border-radius: 999px;
  &:hover {
    color: var(--ui-text-accent);
    background-color: var(--color-primary-alpha-900);
  }
  &:active {
    background-color: var(--color-primary-light-100-alpha-400);
  }
  svg {
    vertical-align: middle;
    width: 15px;
  }
}

.noitemLabel {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.emptyCard {
  width: min(420px, 100%);
  padding: 32px 28px;
  border-radius: 24px;
  border: 1px solid rgba(228, 228, 232, 0.98);
  background:
    radial-gradient(circle at top, var(--color-primary-alpha-900), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 247, 249, 0.98));
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.emptyIcon {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ncm-red-dark);
  background: var(--color-primary-alpha-900);
  box-shadow: inset 0 0 0 1px var(--color-primary-light-300-alpha-800);

  svg {
    width: 24px;
    height: 24px;
  }
}
.emptyCard p {
  font-size: var(--ui-font-title);
  color: var(--ui-text-secondary);
  text-align: center;
  line-height: 1.25;
}

@media (max-width: 900px) {
  .noitemListContainer {
    padding: 18px;
    grid-template-columns: 1fr;
  }

  .emptyCard {
    padding: 26px 22px;
  }
}
</style>
