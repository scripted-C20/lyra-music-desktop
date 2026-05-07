<template>
  <div
    id="container"
    :class="[
      { lock: setting['desktopLyric.isLock'] },
      { 'pause-hide': isPauseHide },
      { 'hover-hide': isHoverHide },
    ]"
    :style="containerStyle"
  >
    <div id="main">
      <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
        <div v-show="!setting['desktopLyric.isLock']" class="control-bar">
          <layout-control-bar />
        </div>
      </transition>
      <layout-lyric-vertical v-if="setting['desktopLyric.direction'] == 'vertical'" />
      <layout-lyric-horizontal v-else />
      <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
        <common-audio-visualizer v-if="setting['desktopLyric.audioVisualization']" />
      </transition>
    </div>
    <template v-if="isShowResize">
      <div class="resize resize-left" @pointerdown.self="handlePointerDown('left', $event)" />
      <div class="resize resize-top" @pointerdown.self="handlePointerDown('top', $event)" />
      <div class="resize resize-right" @pointerdown.self="handlePointerDown('right', $event)" />
      <div class="resize resize-bottom" @pointerdown.self="handlePointerDown('bottom', $event)" />
      <div class="resize resize-top-left" @pointerdown.self="handlePointerDown('top-left', $event)" />
      <div class="resize resize-top-right" @pointerdown.self="handlePointerDown('top-right', $event)" />
      <div class="resize resize-bottom-left" @pointerdown.self="handlePointerDown('bottom-left', $event)" />
      <div class="resize resize-bottom-right" @pointerdown.self="handlePointerDown('bottom-right', $event)" />
    </template>
    <layout-icons />
  </div>
</template>

<script setup>
import useWindowSize from '@lyric/useApp/useWindowSize'
import useHoverHide from '@lyric/useApp/useHoverHide'
import { computed, onMounted } from '@common/utils/vueTools'
import { setting } from '@lyric/store/state'
import { sendConnectMainWindowEvent } from '@lyric/utils/ipc'
import useCommon from '@lyric/useApp/useCommon'
import useLyric from '@lyric/useApp/useLyric'
import useTheme from '@lyric/useApp/useTheme'
import { init as initLyricPlayer } from '@lyric/core/lyric'
import usePauseHide from '@lyric/useApp/usePauseHide'
import { getDesktopLyricBackgroundStyles } from '@common/theme/desktopLyricBackground'

const isShowResize = computed(() => !setting['desktopLyric.isLock'])
useCommon()
const { handlePointerDown } = useWindowSize()
const isHoverHide = useHoverHide()
useLyric()
useTheme()
const isPauseHide = usePauseHide()
const containerStyle = computed(() => {
  const backgroundStyles = getDesktopLyricBackgroundStyles(
    setting['desktopLyric.style.backgroundColor'],
    setting['desktopLyric.style.backgroundOpacity'],
  )

  return {
    '--lyric-window-top': backgroundStyles.topColor,
    '--lyric-window-bottom': backgroundStyles.bottomColor,
    '--lyric-window-lock-top': backgroundStyles.lockTopColor,
    '--lyric-window-lock-bottom': backgroundStyles.lockBottomColor,
    '--lyric-window-interacting-top': backgroundStyles.interactingTopColor,
    '--lyric-window-interacting-bottom': backgroundStyles.interactingBottomColor,
    '--lyric-window-shadow': backgroundStyles.shadowColor,
    '--lyric-window-glow': backgroundStyles.glowColor,
    '--lyric-window-border': backgroundStyles.borderColor,
    '--lyric-window-sheen': backgroundStyles.sheenColor,
  }
})


onMounted(() => {
  initLyricPlayer()
  sendConnectMainWindowEvent()
})

</script>

<style lang="less">
@import './assets/styles/index.less';
@import './assets/styles/layout.less';

body {
  user-select: none;
  height: 100vh;
  box-sizing: border-box;
  color: #fff;
  opacity: 1;
  background-color: transparent;
  overflow: hidden;
  border-radius: 24px;
}

body {
  user-select: none;
  height: 100vh;
  box-sizing: border-box;
  background-color: transparent;
}
html,
body,
#root,
#container {
  border-radius: 24px;
  overflow: hidden;
}
#root {
  height: 100%;
}

#container {
  --lyric-shell-opacity: 1;
  position: relative;
  box-sizing: border-box;
  height: 100%;
  padding: 0;
  transition: opacity .24s ease, filter .24s ease;
  opacity: var(--lyric-shell-opacity);
  touch-action: none;
  overscroll-behavior: none;
  &.pause-hide {
    --lyric-shell-opacity: .74;
  }
  &.hover-hide {
    --lyric-shell-opacity: .54;
  }
  &.pause-hide.hover-hide {
    --lyric-shell-opacity: .44;
  }
  &.lock {
    #main {
      background:
        radial-gradient(circle at top left, var(--color-primary-alpha-800), transparent 60%),
        linear-gradient(180deg, var(--lyric-window-lock-top), var(--lyric-window-lock-bottom));
    }
  }
  &.pause-hide,
  &.hover-hide {
    #main {
      box-shadow:
        0 12px 30px var(--lyric-window-shadow),
        0 6px 14px var(--lyric-window-glow),
        inset 0 0 0 1px var(--lyric-window-border),
        inset 0 0 0 1px var(--color-primary-light-300-alpha-900);
    }
  }
}

@resize-width: 4px;
.resize {
  z-index: 2;
}
.resize-left {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: @resize-width;
  cursor: ew-resize;
  // background-color: rgba(0, 0, 0, 1);
}
.resize-right {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: @resize-width;
  cursor: ew-resize;
}
.resize-top {
  position: absolute;
  left: 0;
  top: 0;
  height: 3px;
  width: 100%;
  cursor: ns-resize;
}
.resize-bottom {
  position: absolute;
  left: 0;
  bottom: 0;
  height: @resize-width;
  width: 100%;
  cursor: ns-resize;
}
.resize-top-left {
  position: absolute;
  left: 0;
  top: 0;
  width: @resize-width;
  height: @resize-width;
  cursor: nwse-resize;
  // background-color: rgba(0, 0, 0, 1);
}
.resize-top-right {
  position: absolute;
  right: 0;
  top: 0;
  width: @resize-width;
  height: @resize-width;
  cursor: nesw-resize;
  // background-color: rgba(0, 0, 0, 1);
}
.resize-bottom-left {
  position: absolute;
  left: 0;
  bottom: 0;
  width: @resize-width;
  height: @resize-width;
  cursor: nesw-resize;
  // background-color: rgba(0, 0, 0, 1);
}
.resize-bottom-right {
  position: absolute;
  right: 0;
  bottom: 0;
  width: @resize-width;
  height: @resize-width;
  cursor: nwse-resize;
  // background-color: rgba(0, 0, 0, 1);
}

#main {
  position: relative;
  box-sizing: border-box;
  height: 100%;
  transition: background-color @transition-theme;
  min-height: 0;
  border-radius: inherit;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, var(--color-primary-alpha-700), transparent 58%),
    linear-gradient(180deg, var(--lyric-window-top), var(--lyric-window-bottom));
  box-shadow:
    0 20px 48px var(--lyric-window-shadow),
    0 8px 18px var(--lyric-window-glow),
    inset 0 0 0 1px var(--lyric-window-border),
    inset 0 0 0 1px var(--color-primary-light-300-alpha-900);
  backdrop-filter: blur(16px) saturate(1.06);
  background-clip: padding-box;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background: linear-gradient(180deg, var(--lyric-window-sheen), rgba(255, 255, 255, 0));
  }

  &:hover {
    .control-bar {
      opacity: 1;
    }
  }
}

#container:not(.lock) #main {
  cursor: move;
}

html.window-interacting,
body.window-interacting {
  #container {
    transition: none;
  }

  #main {
    background: linear-gradient(180deg, var(--lyric-window-interacting-top), var(--lyric-window-interacting-bottom));
    backdrop-filter: none;
    box-shadow:
      0 10px 22px var(--lyric-window-shadow),
      0 5px 12px var(--lyric-window-glow),
      inset 0 0 0 1px var(--lyric-window-border),
      inset 0 0 0 1px var(--color-primary-light-300-alpha-800);
  }

  #main:before {
    opacity: 0;
  }

  .control-bar {
    transition: none;
  }

  .line-content,
  .line-content .font-lrc,
  .line-content .shadow span {
    transition: none !important;
    animation: none !important;
  }
}

.control-bar {
  position: absolute;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  overflow: hidden;
  top: 0;
  left: 0;
  width: 100%;
  opacity: 0;
  transition: opacity @transition-theme;
  z-index: 1;
}
</style>
