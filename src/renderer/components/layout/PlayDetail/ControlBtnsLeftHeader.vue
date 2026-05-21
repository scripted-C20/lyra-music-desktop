<template lang="pug">
div(:class="$style.header" @dblclick="handleHeaderDblclick")
  div(:class="$style.dragZone" @dblclick.stop="handleHeaderDblclick")
  div(ref="dom_btns" :class="$style.controBtn")
    button(ref="dom_hide_btn" type="button" :class="$style.hide" :aria-label="$t('player__hide_detail_tip')" ignore-tip :title="$t('player__hide_detail_tip')" @click="hide")
      line-icon(:icon="ChevronDown" :size="14" :stroke-width="2.35" :class="$style.controBtnIcon")
    button(type="button" :class="$style.min" :aria-label="$t('min')" ignore-tip :title="$t('min')" @click="minWindow")
      line-icon(:icon="Minus" :size="14" :stroke-width="2.2" :class="$style.controBtnIcon")
    button(ref="dom_mode_btn" type="button" :class="$style.modeBtn" :aria-label="modeBtnTitle" ignore-tip :title="modeBtnTitle" @click="toggleWindowMode")
      line-icon(:icon="modeBtnIcon" :size="13" :stroke-width="2.15" :class="$style.controBtnIcon")

    //- button(type="button" :class="$style.max" @click="max")
    button(type="button" :class="$style.close" :aria-label="$t('close')" ignore-tip :title="$t('close')" @click="closeWindow")
      line-icon(:icon="X" :size="14" :stroke-width="2.25" :class="$style.controBtnIcon")
</template>


<script setup>
import { computed, ref, onMounted, onBeforeUnmount, useCssModule } from '@common/utils/vueTools'
import { ChevronDown, Minus, Square, Copy, X } from 'lucide-vue-next'
import LineIcon from '@renderer/components/common/LineIcon.vue'
import { isFullscreen, isWindowMaximized } from '@renderer/store'
import { setShowPlayerDetail } from '@renderer/store/player/action'
import { closeWindow, maxWindow, minWindow } from '@renderer/utils/ipc'

const dom_btns = ref()
let domBtnsEl = null

const cssModule = useCssModule()

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


const dom_hide_btn = ref()
const hide = () => {
  dom_hide_btn.value?.classList.remove(cssModule.hover)
  setShowPlayerDetail(false)
}
const handleHeaderDblclick = (event) => {
  if (!(event.target instanceof HTMLElement)) return
  if (event.target.closest('button')) return
  setShowPlayerDetail(false)
}
const dom_mode_btn = ref()
const modeBtnTitle = computed(() => {
  return isFullscreen.value || isWindowMaximized.value
    ? window.i18n.t('restore')
    : window.i18n.t('max')
})
const modeBtnIcon = computed(() => {
  return isFullscreen.value || isWindowMaximized.value ? Copy : Square
})
const toggleWindowMode = () => {
  dom_mode_btn.value?.classList.remove(cssModule.hover)
  const wasFullscreen = isFullscreen.value
  const wasMaximized = isWindowMaximized.value
  isFullscreen.value = false
  isWindowMaximized.value = !(wasFullscreen || wasMaximized)
  maxWindow()
    .then((maximized) => {
      isWindowMaximized.value = maximized
      return maximized
    })
    .catch(() => {
      isFullscreen.value = wasFullscreen
      isWindowMaximized.value = wasMaximized
      return null
    })
}


</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@detail-control-panel-width: 216px;
@drag-edge-safe-area: 12px;

:global(.fullscreen) {
  .header {
    -webkit-app-region: no-drag;
    align-self: flex-start;
  }

  .dragZone {
    -webkit-app-region: no-drag;
  }
}
.header {
  position: relative;
  flex: 0 0 @height-toolbar;
  -webkit-app-region: no-drag;
  width: 100%;

  .controBtn {
    position: absolute;
    top: 6px;
    z-index: 2;
    display: flex;
    -webkit-app-region: no-drag;

    button {
      display: flex;
      position: relative;
      background: none;
      border: none;
      outline: none;
      padding: 1px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
    }

  }
  .controBtn {
    left: 10px;
    align-items: center;
    gap: 10px;
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;

    button {
      width: 38px;
      height: 34px;
      padding: 0;
      color: var(--color-detail-btn-font);
      border: none;
      border-radius: 12px;
      box-shadow:
        0 3px 10px rgba(15, 23, 42, 0.07),
        inset 0 1px 0 rgba(255, 255, 255, 0.88);
      backdrop-filter: none;
      transition: all 0.15s ease;
      line-height: 0;
      overflow: hidden;
      background-image: none;

      &.hide {
        background-color: var(--color-detail-btn-hide);
      }

      &.min {
        background-color: var(--color-detail-btn-min);
      }

      &.modeBtn {
        background-color: var(--color-detail-btn-min);
      }

      &.close {
        background-color: var(--color-detail-btn-close);
      }

      &.hover {
        color: var(--color-detail-btn-font);
        transform: translateY(-1px);
        filter: brightness(1.02);
        box-shadow:
          0 6px 14px rgba(15, 23, 42, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.94);
      }

      &:active {
        color: var(--color-detail-btn-font);
        transform: scale(0.98);
        filter: brightness(0.98);
        box-shadow:
          0 2px 8px rgba(15, 23, 42, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.82);
      }
    }
  }

  .controBtnIcon {
    display: block;
    width: 14px;
    height: 14px;
    opacity: .86;
    transition: opacity 0.15s ease;
  }

  .modeBtn {
    .controBtnIcon {
      width: 13px;
      height: 13px;
      opacity: .92;
    }
  }
}

.dragZone {
  position: absolute;
  left: @detail-control-panel-width;
  top: @drag-edge-safe-area;
  right: @drag-edge-safe-area;
  bottom: 0;
  z-index: 1;
  user-select: none;
  -webkit-app-region: drag;
}

.controBtnIcon {
  display: block;
  width: 14px;
  height: 14px;
  opacity: .86;
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
}

.modeBtn {
  .controBtnIcon {
    width: 13px;
    height: 13px;
    opacity: .92;
  }
}

</style>
