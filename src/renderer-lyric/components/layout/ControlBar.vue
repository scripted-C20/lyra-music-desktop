<template>
  <div :class="$style.container">
    <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated fadeOut">
      <div v-show="!isShowThemeList" :class="$style.btns" @pointerdown="handleLyricPointerDown">
        <button :class="$style.btn" :title="$t('desktop_lyric__close')" @click="handleClose">
          <common-line-icon :icon="icons.close" :class="$style.icon" :size="18" stroke-width="2" />
        </button>
        <button :class="$style.btn" :title="$t('desktop_lyric__' + (setting['desktopLyric.isLock'] ? 'unlock' : 'lock'))" @click="handleLock">
          <common-line-icon
            :icon="setting['desktopLyric.isLock'] ? icons.unlock : icons.lock"
            :class="$style.icon"
            :size="18"
            stroke-width="2"
          />
        </button>
        <button :class="$style.btn" :title="$t('desktop_lyric__font_increase')" @click="handleFontChange('increase', 1)">
          <common-line-icon :icon="icons.fontIncrease" :class="$style.icon" :size="18" stroke-width="2" />
        </button>
        <button :class="$style.btn" :title="$t('desktop_lyric__font_decrease')" @click="handleFontChange('decrease', 1)">
          <common-line-icon :icon="icons.fontDecrease" :class="$style.icon" :size="18" stroke-width="2" />
        </button>
        <button :class="$style.btn" :title="$t('desktop_lyric__opacity_increase')" @click="handleOpactiyChange('increase', 10)" @contextmenu="handleOpactiyChange('increase', 2)">
          <common-line-icon :icon="icons.opacityIncrease" :class="$style.icon" :size="18" stroke-width="2" />
        </button>
        <button :class="$style.btn" :title="$t('desktop_lyric__opacity_decrease')" @click="handleOpactiyChange('decrease', 10)" @contextmenu="handleOpactiyChange('decrease', 2)">
          <common-line-icon :icon="icons.opacityDecrease" :class="$style.icon" :size="18" stroke-width="2" />
        </button>
        <button :class="$style.btn" :title="$t('desktop_lyric__' + (setting['desktopLyric.style.isZoomActiveLrc'] ? 'lrc_active_zoom_off' : 'lrc_active_zoom_on'))" @click="handleZoomLrc">
          <common-line-icon
            :icon="setting['desktopLyric.style.isZoomActiveLrc'] ? icons.zoomOff : icons.zoomOn"
            :class="$style.icon"
            :size="18"
            stroke-width="2"
          />
        </button>
        <button :class="$style.btn" :title="$t('desktop_lyric__' + (setting['desktopLyric.isAlwaysOnTop'] ? 'win_top_off' : 'win_top_on'))" @click="handleAlwaysOnTop">
          <common-line-icon
            :icon="setting['desktopLyric.isAlwaysOnTop'] ? icons.topOff : icons.topOn"
            :class="$style.icon"
            :size="18"
            stroke-width="2"
          />
        </button>
      </div>
    </transition>
  </div>
</template>

<script>
import { AArrowDown, AArrowUp, Lock, LockOpen, Minus, Pin, PinOff, Plus, Vibrate, VibrateOff, X } from 'lucide-vue-next'
import { markRaw, ref } from '@common/utils/vueTools'
import { setting } from '@lyric/store/state'
import { updateSetting } from '@lyric/store/action'
import useDrag from './useDrag'

export default {
  setup() {
    const isShowThemeList = ref(false)
    const { handleLyricPointerDown } = useDrag()
    const icons = {
      close: markRaw(X),
      lock: markRaw(Lock),
      unlock: markRaw(LockOpen),
      fontIncrease: markRaw(AArrowUp),
      fontDecrease: markRaw(AArrowDown),
      opacityIncrease: markRaw(Plus),
      opacityDecrease: markRaw(Minus),
      zoomOn: markRaw(Vibrate),
      zoomOff: markRaw(VibrateOff),
      topOn: markRaw(Pin),
      topOff: markRaw(PinOff),
    }

    const handleClose = () => {
      updateSetting({ 'desktopLyric.enable': false })
    }
    const handleLock = () => {
      updateSetting({ 'desktopLyric.isLock': true })
    }
    const handleAlwaysOnTop = () => {
      updateSetting({ 'desktopLyric.isAlwaysOnTop': !setting['desktopLyric.isAlwaysOnTop'] })
    }
    const handleZoomLrc = () => {
      updateSetting({ 'desktopLyric.style.isZoomActiveLrc': !setting['desktopLyric.style.isZoomActiveLrc'] })
    }
    const handleFontChange = (action, step) => {
      let num
      switch (action) {
        case 'increase':
          num = Math.min(setting['desktopLyric.style.fontSize'] + step, 80)
          break
        case 'decrease':
          num = Math.max(setting['desktopLyric.style.fontSize'] - step, 10)
          break
      }
      if (setting['desktopLyric.style.fontSize'] == num) return
      updateSetting({ 'desktopLyric.style.fontSize': num })
    }
    const handleOpactiyChange = (action, step) => {
      let num
      switch (action) {
        case 'increase':
          num = Math.min(setting['desktopLyric.style.opacity'] + step, 100)
          break
        case 'decrease':
          num = Math.max(setting['desktopLyric.style.opacity'] - step, 6)
          break
      }
      if (setting['desktopLyric.style.opacity'] == num) return
      updateSetting({ 'desktopLyric.style.opacity': num })
    }
    return {
      setting,
      isShowThemeList,
      icons,

      handleClose,
      handleLock,
      handleAlwaysOnTop,
      handleZoomLrc,
      handleFontChange,
      handleOpactiyChange,
      handleLyricPointerDown,
    }
  },
}
</script>

<style lang="less" module>
@import '../../assets/styles/layout.less';

@bar-height: 38px;
@bar-height-padding: 7px;

.container {
  position: relative;
  // height: 50px;
  transition: opacity @transition-theme;
  // opacity: 0;
  // &:hover {
  //   opacity: 1;
  // }
}

.btns {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: linear-gradient(180deg, rgba(11, 13, 18, 0.92), rgba(11, 13, 18, 0.84));
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px) saturate(1.08);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  min-width: 32px;
  height: 30px;
  min-height: 30px;
  padding: 0;
  cursor: pointer;
  border: none;
  outline: none;
  border-radius: 10px;
  background: none;
  color: rgba(255, 255, 255, 0.94);
  transition: opacity @transition-theme, background-color @transition-theme, color @transition-theme, transform @transition-theme;
  &:hover {
    opacity: 1;
    color: #fff;
    background-color: rgba(255, 255, 255, 0.1);
  }
  &:active {
    transform: scale(0.96);
    background-color: rgba(255, 255, 255, 0.14);
  }
}

.icon {
  width: 18px;
  height: 18px;
  opacity: .96;
}

</style>
