<template>
  <div v-show="!isFullscreen" ref="dom_btns" :class="$style.control">
    <button type="button" :class="[$style.btn, $style.min]" :aria-label="$t('min')" ignore-tip :title="$t('min')" @click="minWindow">
      <line-icon :icon="Minus" :size="14" :stroke-width="2.2" :class="$style.btnIcon" />
    </button>
    <button type="button" :class="[$style.btn, $style.max]" :aria-label="maxBtnTitle" ignore-tip :title="maxBtnTitle" @click="toggleMaxWindow">
      <line-icon :icon="maxBtnIcon" :size="13" :stroke-width="2.15" :class="$style.btnIcon" />
    </button>
    <button type="button" :class="[$style.btn, $style.close]" :aria-label="$t('close')" ignore-tip :title="$t('close')" @click="closeWindow">
      <line-icon :icon="X" :size="14" :stroke-width="2.25" :class="$style.btnIcon" />
    </button>
  </div>
</template>

<script setup>
import { minWindow, maxWindow, closeWindow } from '@renderer/utils/ipc'
import { computed, onMounted, onBeforeUnmount, ref, useCssModule } from '@common/utils/vueTools'
import { Minus, Square, Copy, X } from 'lucide-vue-next'
import LineIcon from '@renderer/components/common/LineIcon.vue'
// import { getRandom } from '../../utils'
import { isFullscreen, isWindowMaximized } from '@renderer/store'

const dom_btns = ref()
let domBtnsEl = null

const cssModule = useCssModule()
const maxBtnTitle = computed(() => {
  return isWindowMaximized.value ? window.i18n.t('restore') : window.i18n.t('max')
})
const maxBtnIcon = computed(() => {
  return isWindowMaximized.value ? Copy : Square
})
const toggleMaxWindow = () => {
  isWindowMaximized.value = !isWindowMaximized.value
  maxWindow()
    .then((maximized) => {
      isWindowMaximized.value = maximized
    })
    .catch(() => {
      isWindowMaximized.value = false
      return null
    })
}

const handle_focus = () => {
  if (!dom_btns.value) return
  for (const node of dom_btns.value.childNodes) {
    if (node.tagName != 'BUTTON') continue
    node.classList.remove(cssModule.hover)
  }
}
const getBtnEl = (target) => {
  let el = target instanceof Element ? target : null
  while (el && el.tagName != 'BUTTON') el = el.parentElement
  return el
}
const handle_mouseover = (event) => {
  const btn = getBtnEl(event.target)
  if (!btn) return
  btn.classList.add(cssModule.hover)
}
const handle_mouseout = (event) => {
  const btn = getBtnEl(event.target)
  if (!btn) return
  btn.classList.remove(cssModule.hover)
}


onMounted(() => {
  window.app_event.on('focus', handle_focus)
  domBtnsEl = dom_btns.value
  if (!domBtnsEl) return
  domBtnsEl.addEventListener('mouseover', handle_mouseover)
  domBtnsEl.addEventListener('mouseout', handle_mouseout)
})
onBeforeUnmount(() => {
  window.app_event.off('focus', handle_focus)
  domBtnsEl?.removeEventListener('mouseover', handle_mouseover)
  domBtnsEl?.removeEventListener('mouseout', handle_mouseout)
  domBtnsEl = null
})

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.control {
  display: flex;
  align-self: center;
  -webkit-app-region: no-drag;
  align-items: center;
  gap: 8px;
  height: @height-toolbar;

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 38px;
    height: 34px;
    background-color: transparent;
    background-image: none;
    border: none;
    outline: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-btn-font);
    transition: all 0.15s ease;
    border-radius: 12px;
    box-shadow:
      0 6px 14px rgba(115, 18, 18, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.18);
    &.min {
      background-color: var(--color-btn-min);
    }
    &.max {
      background-color: var(--color-btn-hide);
    }
    &.close {
      background-color: var(--color-btn-close);
    }
    &.hover {
      color: var(--color-btn-font);
      transform: translateY(-1px);
      filter: brightness(1.08);
      box-shadow:
        0 8px 18px rgba(115, 18, 18, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.24);
    }
    &:active {
      color: var(--color-btn-font);
      transform: scale(0.97);
      filter: brightness(0.95);
      box-shadow:
        0 4px 10px rgba(115, 18, 18, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
    }
  }
}

.btnIcon {
  width: 14px;
  height: 14px;
  opacity: .98;
  transition: opacity 0.15s ease;
}

</style>
