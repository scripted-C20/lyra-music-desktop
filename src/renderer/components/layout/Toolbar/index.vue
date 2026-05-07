<template>
  <div :class="[$style.toolbar, { [$style.fullscreen]: isFullscreen }]">
    <div :class="$style.leftTools">
      <ControlBtns v-if="appSetting['common.controlBtnPosition'] == 'left'" />
      <div :class="$style.history">
        <button type="button" :class="$style.historyBtn" :aria-label="$t('pagination__prev')" @click="router.back()">
          <line-icon :icon="ChevronLeft" :size="14" :class="$style.historyIcon" />
        </button>
        <button type="button" :class="$style.historyBtn" :aria-label="$t('pagination__next')" @click="router.forward()">
          <line-icon :icon="ChevronRight" :size="14" :class="$style.historyIcon" />
        </button>
      </div>
    </div>
    <SearchInput />
    <div :class="$style.rightTools">
      <div v-if="appSetting['common.controlBtnPosition'] == 'left'" :class="$style.windowControlSpacer" aria-hidden="true" />
      <ControlBtns v-else />
    </div>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

import { isFullscreen } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'
import { useRouter } from '@common/utils/vueRouter'
import ControlBtns from './ControlBtns.vue'
import SearchInput from './SearchInput.vue'

const router = useRouter()

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.toolbar {
  display: flex;
  height: @height-toolbar;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 22px;
  -webkit-app-region: drag;
  z-index: 2;
  background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-dark-100) 100%);
  color: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  &.fullscreen {
    -webkit-app-region: no-drag;
  }
}

.leftTools,
.rightTools {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  min-width: 0;
  -webkit-app-region: no-drag;
}

.rightTools {
  justify-content: flex-end;
}

.history {
  display: flex;
  align-items: center;
  gap: 10px;
}

.historyBtn {
  width: 38px;
  height: 38px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: background-color @transition-fast, transform @transition-fast, box-shadow @transition-fast;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);

  &:hover {
    background: rgba(255, 255, 255, 0.22);
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
  }

  &:active {
    transform: scale(0.96);
    background: rgba(255, 255, 255, 0.28);
  }
}

.historyIcon {
  display: block;
  flex: none;
  width: 13px;
  height: 13px;
}

.windowControlSpacer {
  width: 120px;
  height: 30px;
  flex: none;
}

</style>
