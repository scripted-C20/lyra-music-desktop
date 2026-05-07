<template lang="pug">
div(:class="$style.header" @dblclick="handleHeaderDblclick")
  div(:class="$style.dragZone" @dblclick.stop="handleHeaderDblclick")
  div(ref="dom_btns" :class="$style.controBtn")
    button(ref="dom_hide_btn" type="button" :class="$style.hide" :aria-label="$t('player__hide_detail_tip')" ignore-tip :title="$t('player__hide_detail_tip')" @click="hide")
      line-icon(:icon="ChevronDown" :size="16" :stroke-width="2.35" :class="$style.controBtnIcon")
    button(type="button" :class="$style.min" :aria-label="$t('min')" ignore-tip :title="$t('min')" @click="minWindow")
      line-icon(:icon="Minus" :size="16" :stroke-width="2.2" :class="$style.controBtnIcon")
    button(ref="dom_mode_btn" type="button" :class="$style.modeBtn" :aria-label="modeBtnTitle" ignore-tip :title="modeBtnTitle" @click="toggleWindowMode")
      line-icon(:icon="modeBtnIcon" :size="15" :stroke-width="2.15" :class="$style.controBtnIcon")

    //- button(type="button" :class="$style.max" @click="max")
    button(type="button" :class="$style.close" :aria-label="$t('close')" ignore-tip :title="$t('close')" @click="closeWindow")
      line-icon(:icon="X" :size="16" :stroke-width="2.25" :class="$style.controBtnIcon")
</template>


<script setup>
import { computed, onMounted, onBeforeUnmount, ref, useCssModule } from '@common/utils/vueTools'
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

@control-btn-width: @height-toolbar * .26;
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
  align-self: flex-start;

  .controBtn {
    position: absolute;
    top: 0;
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
    right: 0;
    align-items: center;
    gap: 6px;
    padding: 4px 2px 0 0;
    button {
      width: 36px;
      height: 30px;
      padding: 0;
      color: var(--ui-text-secondary);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.74), rgba(246, 247, 250, 0.66));
      border: 1px solid rgba(255, 255, 255, 0.72);
      border-radius: 12px;
      box-shadow:
        0 6px 16px rgba(15, 23, 42, 0.04),
        inset 0 1px 0 rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(10px) saturate(1.02);
      transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out, transform 0.18s ease, box-shadow 0.18s ease;

      &.hover {
        transform: translateY(-1px);
        color: var(--ui-text-primary);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 248, 250, 0.84));
        box-shadow:
          0 10px 18px rgba(15, 23, 42, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);

        &.close {
          color: #fff;
          background: linear-gradient(135deg, var(--color-btn-close), var(--color-btn-close));
          box-shadow:
            0 10px 18px rgba(244, 63, 94, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.22);
        }
      }

      &:active {
        transform: scale(0.96);
      }
    }
  }
}

.dragZone {
  position: absolute;
  left: @drag-edge-safe-area;
  top: @drag-edge-safe-area;
  right: 162px;
  bottom: 0;
  z-index: 1;
  user-select: none;
  -webkit-app-region: drag;
}

.controBtnIcon {
  width: 16px;
  height: 16px;
  opacity: .84;
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
}

.modeBtn {
  .controBtnIcon {
    width: 15px;
    height: 15px;
    opacity: .92;
  }
}

</style>
