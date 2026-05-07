<template lang="pug">
transition(enter-active-class="animated slideInRight" leave-active-class="animated slideOutDown" @after-enter="handleAfterEnter" @after-leave="handleAfterLeave")
  div(v-if="isShowPlayerDetail" ref="dom_container" :class="[$style.container, { fullscreen: isFullscreen }]" @click.capture="handleClickCapture" @dblclick="handleDblclick" @contextmenu="handleContextMenu")
    div(:class="$style.bg" :style="bgStyle" @dblclick.stop="hide")
    //- div(:class="$style.bg" :style="bgStyle")
    //- div(:class="$style.bg2")
    ControlBtnsLeftHeader(v-if="appSetting['common.controlBtnPosition'] == 'left'")
    ControlBtnsRightHeader(v-else)
    div(:class="[$style.main, {[$style.showComment]: isShowPlayComment}]" @dblclick="handleDblclick")
      div.left(:class="$style.left")
        div(:class="$style.info")
          div(:class="$style.infoCard")
            div(:class="[$style.coverFrame, { [$style.coverPlaying]: isPlay }]")
              img(v-if="musicInfo.pic" :class="$style.img" :src="musicInfo.pic")
              div(v-else :class="$style.imgPlaceholder")
                span {{ (musicInfo.name || '').slice(0, 1) || 'L' }}

      transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
        LyricPlayer(v-if="visibled" @dblclick="handleDblclick")
      music-comment(v-if="visibled" :class="$style.comment" :show="isShowPlayComment" :music-info="playMusicInfo.musicInfo" @close="hideComment")
    transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
      play-bar(v-if="visibled" @dblclick="handleDblclick")
    transition(enter-active-class="animated-slow fadeIn" leave-active-class="animated-slow fadeOut")
      common-audio-visualizer(v-if="appSetting['player.audioVisualization'] && visibled")
</template>


<script>
import { computed, ref, watch } from '@common/utils/vueTools'
import { isFullscreen } from '@renderer/store'
import {
  isPlay,
  isShowPlayerDetail,
  isShowPlayComment,
  musicInfo,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setShowPlayerDetail,
  setShowPlayComment,
  setShowPlayLrcSelectContentLrc,
} from '@renderer/store/player/action'
import LyricPlayer from './LyricPlayer.vue'
import PlayBar from './PlayBar.vue'
import MusicComment from './components/MusicComment/index.vue'
import ControlBtnsLeftHeader from './ControlBtnsLeftHeader.vue'
import ControlBtnsRightHeader from './ControlBtnsRightHeader.vue'
import { registerAutoHideMounse, unregisterAutoHideMounse } from './autoHideMounse'
import { appSetting } from '@renderer/store/setting'
import { closeWindow, maxWindow, minWindow, setFullScreen } from '@renderer/utils/ipc'

export default {
  name: 'CorePlayDetail',
  components: {
    ControlBtnsLeftHeader,
    ControlBtnsRightHeader,
    LyricPlayer,
    PlayBar,
    MusicComment,
  },
  setup() {
    const visibled = ref(false)
    const dom_container = ref(null)
    const bgStyle = computed(() => {
      if (!musicInfo.pic) return null
      const url = String(musicInfo.pic).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      return {
        '--play-detail-cover-bg': `url("${url}")`,
      }
    })

    let clickTime = 0
    const detailClickState = {
      time: 0,
      x: 0,
      y: 0,
      target: null,
    }

    const resetDetailClickState = () => {
      detailClickState.time = 0
      detailClickState.x = 0
      detailClickState.y = 0
      detailClickState.target = null
    }

    const hide = () => {
      setShowPlayerDetail(false)
    }
    const handleContextMenu = () => {
      if (window.performance.now() - clickTime > 400) {
        clickTime = window.performance.now()
        return
      }
      clickTime = 0
      hide()
    }
    const handleDblclick = (event) => {
      if (!(event.target instanceof HTMLElement)) return
      if (event.target.closest('button, a, input, textarea, select, label, [data-player-detail-ignore="true"]')) return
      hide()
    }
    const handleClickCapture = (event) => {
      if (!isShowPlayerDetail.value) return
      if (!(event.target instanceof HTMLElement)) return
      if (event.target.closest('button, a, input, textarea, select, label, [data-player-detail-ignore="true"]')) {
        resetDetailClickState()
        return
      }
      if (window.getSelection()?.toString()) {
        resetDetailClickState()
        return
      }
      if (dom_container.value && !dom_container.value.contains(event.target)) {
        resetDetailClickState()
        return
      }

      const now = typeof event.timeStamp == 'number' ? event.timeStamp : window.performance.now()
      const isFastDoubleClick = now - detailClickState.time < 280
      const isNearLastPoint = Math.abs(event.clientX - detailClickState.x) < 8 && Math.abs(event.clientY - detailClickState.y) < 8
      const lastTarget = detailClickState.target
      const isSameArea = lastTarget instanceof HTMLElement
        ? lastTarget === event.target || lastTarget.contains(event.target) || event.target.contains(lastTarget)
        : true

      detailClickState.time = now
      detailClickState.x = event.clientX
      detailClickState.y = event.clientY
      detailClickState.target = event.target

      if (isFastDoubleClick && isNearLastPoint && isSameArea) {
        resetDetailClickState()
        hide()
      }
    }

    const hideComment = () => {
      setShowPlayComment(false)
    }

    const handleAfterEnter = () => {
      if (isFullscreen.value) registerAutoHideMounse()

      visibled.value = true
    }

    const handleAfterLeave = () => {
      setShowPlayLrcSelectContentLrc(false)
      hideComment(false)
      visibled.value = false
      resetDetailClickState()

      unregisterAutoHideMounse()
    }

    watch(isFullscreen, isFullscreen => {
      (isFullscreen ? registerAutoHideMounse : unregisterAutoHideMounse)()
    })
    watch(isShowPlayerDetail, value => {
      if (!value) resetDetailClickState()
    })


    return {
      appSetting,
      bgStyle,
      dom_container,
      isPlay,
      playMusicInfo,
      isShowPlayerDetail,
      isShowPlayComment,
      musicInfo,
      hide,
      handleClickCapture,
      handleDblclick,
      handleContextMenu,
      hideComment,
      handleAfterEnter,
      handleAfterLeave,
      visibled,
      isFullscreen,
      fullscreenExit() {
        setFullScreen(false)
          .then((fullscreen) => {
            isFullscreen.value = fullscreen
          })
          .catch(() => null)
      },
      min() {
        minWindow()
      },
      max() {
        maxWindow().catch(() => null)
      },
      close() {
        closeWindow()
      },
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@control-btn-width: @height-toolbar * .26;

.container {
  --play-detail-shell-width: min(1080px, calc(100% - 220px));
  --play-detail-shell-expanded-width: min(1400px, calc(100% - 132px));
  position: absolute;
  display: flex;
  flex-flow: column nowrap;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: var(--color-content-background);
  z-index: 10;
  // -webkit-app-region: drag;
  overflow: hidden;
  border-radius: @radius-border;
  color: var(--color-font);
  // border-left: 12px solid var(--color-primary-alpha-900);
  -webkit-app-region: no-drag;
  contain: strict;
  isolation: isolate;
  font-family: "Microsoft YaHei UI", "PingFang SC", "Helvetica Neue", sans-serif;

  box-sizing: border-box;
  background:
    radial-gradient(circle at 17% 22%, var(--color-primary-alpha-900), transparent 31%),
    radial-gradient(circle at 78% 11%, rgba(255, 255, 255, 0.82), transparent 26%),
    linear-gradient(180deg, rgba(249, 247, 245, 0.985), rgba(244, 241, 239, 0.995) 46%, rgba(248, 248, 248, 0.995));

  * {
    box-sizing: border-box;
  }
}
.bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: var(--play-detail-cover-bg, var(--background-image)) center no-repeat;
  background-size: cover;
  filter: blur(46px) saturate(1.18);
  transform: scale(1.14);
  opacity: .22;
  z-index: -1;
  pointer-events: none;
}
// .bg2 {
//   position: absolute;
//   width: 100%;
//   height: 100%;
//   top: 0;
//   left: 0;
//   z-index: -1;
//   background-color: rgba(255, 255, 255, .8);
// }

.main {
  flex: auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: clamp(44px, 5.6vw, 88px);
  width: var(--play-detail-shell-width);
  margin: 0 auto;
  padding: 28px 0 12px;
  position: relative;

  &.showComment {
    width: var(--play-detail-shell-expanded-width);
    gap: clamp(26px, 3.2vw, 48px);
    padding-bottom: 24px;

    .left {
      flex-basis: 316px;
    }
    :global(.right) {
      flex: 1 1 400px;
      max-width: 520px;
      .lyricSelectContent {
        font-size: 14px;
      }
    }
    .comment {
      flex: 0 0 var(--comment-width, min(760px, 50%));
      width: var(--comment-width, min(760px, 50%));
      height: calc(100% - 8px);
      opacity: 1;
      transform: scaleX(1);
      pointer-events: auto;
    }
  }
}
.left {
  flex: 0 0 368px;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  padding: 0 0 34px;
  overflow: visible;
  transition: flex-basis @transition-normal;
}

.info {
  width: min(100%, 368px);
  min-height: 0;
}
.infoCard {
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  min-height: 0;
  width: clamp(286px, 26vw, 348px);
  padding: 40px 10px 16px;
  overflow: visible;

  &:before {
    content: '';
    position: absolute;
    left: 57%;
    top: 2px;
    z-index: 5;
    width: 118px;
    height: 13px;
    border-radius: 999px;
    transform: rotate(28deg);
    transform-origin: 12px 50%;
    background:
      linear-gradient(90deg, rgba(252, 252, 252, 0.96), rgba(190, 193, 199, 0.98) 42%, rgba(255, 255, 255, 0.92));
    box-shadow:
      0 8px 14px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.88);
  }

  &:after {
    content: '';
    position: absolute;
    left: calc(57% - 16px);
    top: -11px;
    z-index: 6;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 38% 36%, #fff, #d9dce1 42%, #8d939d 100%);
    box-shadow:
      0 10px 20px rgba(0, 0, 0, 0.14),
      inset 0 1px 1px rgba(255, 255, 255, 0.9);
  }
}
.coverFrame {
  position: relative;
  width: 100%;
  max-width: 334px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  overflow: visible;
  background:
    radial-gradient(circle at 50% 50%, #202124 0 9%, #0d0f12 10% 32%, #16181d 33% 58%, #08090b 59% 100%);
  box-shadow:
    0 22px 34px rgba(15, 23, 42, 0.1),
    0 6px 12px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: inherit;
    background:
      repeating-radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 8px),
      radial-gradient(circle at 37% 28%, rgba(255, 255, 255, 0.18), transparent 21%),
      radial-gradient(circle at 50% 50%, transparent 0 35%, rgba(255, 255, 255, 0.06) 36%, transparent 39%, transparent 100%);
    pointer-events: none;
  }

  &:after {
    content: '';
    position: absolute;
    left: calc(50% - 12px);
    top: calc(50% - 12px);
    z-index: 3;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 45% 42%, rgba(255, 255, 255, 0.86), #cfd3d8 42%, #5a606a 100%);
    box-shadow:
      0 0 0 8px rgba(255, 255, 255, 0.1),
      0 4px 12px rgba(0, 0, 0, 0.22);
  }
}
.coverPlaying {
  animation: playDetailDiscSpin 28s linear infinite;
}
.img {
  display: block;
  position: absolute;
  left: 18%;
  top: 18%;
  z-index: 2;
  width: 64%;
  height: 64%;
  border: 7px solid rgba(10, 12, 15, 0.82);
  border-radius: 50%;
  object-fit: cover;
  opacity: 1;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.24);
}
.imgPlaceholder {
  position: absolute;
  left: 18%;
  top: 18%;
  z-index: 2;
  width: 64%;
  height: 64%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 7px solid rgba(10, 12, 15, 0.82);
  border-radius: 50%;
  background:
    linear-gradient(135deg, var(--color-primary-alpha-600), rgba(255, 255, 255, 0.9));
  font-size: clamp(46px, 5vw, 76px);
  font-weight: 700;
  color: var(--color-primary-dark-200);
}
.comment {
  flex: 0 0 0;
  width: 0;
  min-width: 0;
  height: 100%;
  align-self: center;
  opacity: 0;
  border-radius: 28px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.88);
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.08),
    0 6px 16px var(--color-primary-alpha-900),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px) saturate(1.02);
  transform: scaleX(0);
  pointer-events: none;
}

@media (max-width: 1140px) {
  .container {
    --play-detail-shell-width: calc(100% - 56px);
    --play-detail-shell-expanded-width: calc(100% - 56px);
  }

  .main {
    gap: clamp(28px, 4.6vw, 48px);
  }

  .left {
    flex-basis: 310px;
  }
}

@keyframes playDetailDiscSpin {
  to {
    transform: rotate(360deg);
  }
}

</style>
