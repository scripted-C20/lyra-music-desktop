<template>
  <div :class="['right', $style.right]" :style="lrcFontSize">
    <div v-show="!isShowLrcSelectContent" :class="$style.musicHeader">
      <h1 :class="$style.musicName">{{ playerMusicInfo.name || 'LX Music' }}</h1>
      <div v-if="playerMusicInfo.singer || playerMusicInfo.album" :class="$style.musicMeta">
        <span v-if="playerMusicInfo.singer">{{ playerMusicInfo.singer }}</span>
        <span v-if="playerMusicInfo.album">{{ playerMusicInfo.album }}</span>
      </div>
    </div>
    <div :class="$style.lyricStage">
      <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
        <div
v-show="!isShowLrcSelectContent" ref="dom_lyric"
          :class="['lyric', $style.lyric, { [$style.draging]: isMsDown }, { [$style.lrcActiveZoom]: isZoomActiveLrc }]"
          :style="lrcStyles" @wheel="handleWheel" @mousedown="handleLyricMouseDown" @touchstart="handleLyricTouchStart"
          @contextmenu.stop="handleShowLyricMenu"
>
          <div :class="['pre', $style.lyricSpace]" />
          <div ref="dom_lyric_text" />
          <div :class="$style.lyricSpace" />
        </div>
      </transition>
      <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
        <div v-if="isShowLyricProgressSetting" v-show="isStopScroll && !isShowLrcSelectContent" :class="$style.skip">
          <div ref="dom_skip_line" :class="$style.line" />
          <span :class="$style.label">{{ timeStr }}</span>
          <base-btn
:class="$style.skipBtn" @mouseenter="handleSkipMouseEnter" @mouseleave="handleSkipMouseLeave"
            @click="handleSkipPlay"
>
            <line-icon :icon="Play" :size="15" />
          </base-btn>
        </div>
      </transition>
      <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
        <div
v-if="isShowLrcSelectContent" ref="dom_lrc_select_content" tabindex="-1"
          :class="[$style.lyricSelectContent, 'select', 'scroll', 'lyricSelectContent']"
          @contextmenu="handleCopySelectText"
>
          <div
v-for="(info, index) in lyric.lines" :key="index"
            :class="[$style.lyricSelectline, { [$style.lrcActive]: lyric.line == index }]"
>
            <span>{{ info.text }}</span>
            <template v-for="(lrc, i) in info.extendedLyrics" :key="i">
              <br>
              <span :class="$style.lyricSelectlineExtended">{{ lrc }}</span>
            </template>
          </div>
        </div>
      </transition>
    </div>
    <LyricMenu v-model="lyricMenuVisible" :xy="lyricMenuXY" :lyric-info="lyricInfo" @update-lyric="handleUpdateLyric" />
  </div>
</template>

<script>
import { Play } from 'lucide-vue-next'
import { markRaw } from 'vue'

import { clipboardWriteText } from '@common/utils/electron'
import { lyric } from '@renderer/store/player/lyric'
import { playProgress } from '@renderer/store/player/playProgress'
import { isFullscreen } from '@renderer/store'
import {
  isPlay,
  isShowLrcSelectContent,
  isShowPlayComment,
  musicInfo as playerMusicInfo,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setMusicInfo,
} from '@renderer/store/player/action'
import { onMounted, onBeforeUnmount, computed, reactive, ref, nextTick, watch } from '@common/utils/vueTools'
import useLyric from '@renderer/utils/compositions/useLyric'
import LyricMenu from './components/LyricMenu.vue'
import { appSetting } from '@renderer/store/setting'
import { setLyricOffset } from '@renderer/core/lyric'
import useSelectAllLrc from './useSelectAllLrc'

export default {
  components: {
    LyricMenu,
  },
  setup() {
    const isZoomActiveLrc = computed(() => appSetting['playDetail.isZoomActiveLrc'])
    const isShowLyricProgressSetting = computed(() => appSetting['playDetail.isShowLyricProgressSetting'])

    const {
      dom_lyric,
      dom_lyric_text,
      dom_skip_line,
      isMsDown,
      isStopScroll,
      timeStr,
      handleLyricMouseDown,
      handleLyricTouchStart,
      handleWheel,
      handleSkipPlay,
      handleSkipMouseEnter,
      handleSkipMouseLeave,
      handleScrollLrc,
    } = useLyric({ isPlay, lyric, playProgress, isShowLyricProgressSetting })

    const dom_lrc_select_content = useSelectAllLrc()

    watch([isFullscreen, isShowPlayComment], () => {
      setTimeout(handleScrollLrc, 400)
    })

    const lyricMenuVisible = ref(false)
    const lyricMenuXY = reactive({
      x: 0,
      y: 0,
    })
    const lyricInfo = reactive({
      lyric: '',
      tlyric: '',
      rlyric: '',
      lxlyric: '',
      rawlyric: '',
      musicInfo: null,
    })
    const updateMusicInfo = () => {
      lyricInfo.lyric = playerMusicInfo.lrc
      lyricInfo.tlyric = playerMusicInfo.tlrc
      lyricInfo.rlyric = playerMusicInfo.rlrc
      lyricInfo.lxlyric = playerMusicInfo.lxlrc
      lyricInfo.rawlyric = playerMusicInfo.rawlrc
      lyricInfo.musicInfo = playMusicInfo.musicInfo
    }
    const handleShowLyricMenu = event => {
      updateMusicInfo()
      lyricMenuXY.x = event.pageX
      lyricMenuXY.y = event.pageY
      if (lyricMenuVisible.value) return
      void nextTick(() => {
        lyricMenuVisible.value = true
      })
    }
    const handleUpdateLyric = ({ lyric, tlyric, rlyric, lxlyric, offset }) => {
      setMusicInfo({
        lrc: lyric,
        tlrc: tlyric,
        rlrc: rlyric,
        lxlrc: lxlyric,
      })
      console.log(offset)
      setLyricOffset(offset)
    }

    const lrcStyles = computed(() => {
      return {
        textAlign: appSetting['playDetail.style.align'],
      }
    })
    const lrcFontSize = computed(() => {
      let size = appSetting['playDetail.style.fontSize'] / 100
      if (isFullscreen.value) size = size *= 1.4
      return {
        '--playDetail-lrc-font-size': (isShowPlayComment.value ? size * 0.82 : size) + 'rem',
      }
    })

    onMounted(() => {
      window.app_event.on('musicToggled', updateMusicInfo)
      window.app_event.on('lyricUpdated', updateMusicInfo)
    })
    onBeforeUnmount(() => {
      window.app_event.off('musicToggled', updateMusicInfo)
      window.app_event.off('lyricUpdated', updateMusicInfo)
    })

    return {
      Play: markRaw(Play),
      dom_lyric,
      dom_lyric_text,
      dom_skip_line,
      dom_lrc_select_content,
      isMsDown,
      timeStr,
      handleLyricMouseDown,
      handleLyricTouchStart,
      handleWheel,
      handleSkipPlay,
      handleSkipMouseEnter,
      handleSkipMouseLeave,
      playerMusicInfo,
      lyric,
      lrcStyles,
      lrcFontSize,
      isShowLrcSelectContent,
      isShowLyricProgressSetting,
      isZoomActiveLrc,
      isStopScroll,
      lyricMenuVisible,
      lyricMenuXY,
      handleShowLyricMenu,
      handleUpdateLyric,
      lyricInfo,
    }
  },
  methods: {
    handleCopySelectText() {
      let str = window.getSelection().toString()
      str = str.trim()
      if (!str.length) return
      clipboardWriteText(str)
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.right {
  flex: 1 1 0;
  position: relative;
  min-width: 0;
  max-width: 620px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: clamp(28px, 4.4vw, 56px) 0 28px;
  transition: flex-basis @transition-normal, max-width @transition-normal;
}

.musicHeader {
  flex: 0 0 auto;
  min-width: 0;
  padding: 0 4px 22px;
  color: #333;
}

.musicName {
  margin: 0;
  color: var(--color-900);
  font-size: clamp(26px, 2.4vw, 34px);
  line-height: 1.22;
  font-weight: 600;
  letter-spacing: -0.02em;
  .mixin-ellipsis-2();
}

.musicMeta {
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  gap: 7px 0;
  margin-top: 12px;
  color: var(--color-650);
  font-size: 14px;
  line-height: 1.4;

  span {
    min-width: 0;
    .mixin-ellipsis-1();

    +span {
      &:before {
        content: '/';
        padding: 0 10px;
        color: var(--color-450);
      }
    }
  }
}

.lyricStage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

.lyric {
  text-align: center;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-size: var(--playDetail-lrc-font-size, 16px);
  padding: 14px 4px 30px;
  -webkit-mask-image: linear-gradient(transparent 0%, #fff 12%, #fff 88%, transparent 100%);
  cursor: grab;
  position: relative;
  z-index: 1;

  &.draging {
    cursor: grabbing;
  }

  :global {
    .font-lrc {
      color: #555;
      transition: color .28s ease, opacity .28s ease;
    }

    .line-content {
      position: relative;
      line-height: 1.42;
      margin: 0;
      padding: calc(var(--playDetail-lrc-font-size, 16px) * .58) 2px;
      overflow-wrap: break-word;
      color: #555;
      opacity: .52;
      transform: translate3d(0, 8px, 0) scale(0.992);
      transition:
        transform .34s cubic-bezier(.22, 1, .36, 1),
        opacity .26s ease,
        filter .26s ease,
        padding @transition-normal;
      will-change: transform, opacity;

      .extended {
        font-size: 0.8em;
        margin-top: 5px;
        opacity: .78;
      }

      &.line-mode {
        .font-lrc {
          transition: @transition-fast;
          transition-property: font-size, color;
        }
      }

      &.active {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
        filter: saturate(1.08);
        text-shadow: 0 5px 18px rgba(236, 65, 65, 0.08);

        .font-lrc {
          font-weight: 600;
          color: var(--color-primary);
        }
      }

      &.played:not(.active) {
        opacity: .72;
        transform: translate3d(0, 0, 0) scale(0.995);
      }

      &.line-mode.active .font-lrc,
      &.font-mode.played .font-lrc {
        color: var(--color-primary);
      }

      &.font-mode .extended .font-lrc {
        transition: @transition-slow;
        transition-property: font-size, color;
      }

      &.font-mode>.line>.font-lrc {
        >span {
          transition: @transition-normal;
          transition-property: font-size;
          font-size: 1em;
          background-repeat: no-repeat;
          background-color: #555;
          background-image: -webkit-linear-gradient(top, var(--color-primary), var(--color-primary));
          -webkit-text-fill-color: transparent;
          -webkit-background-clip: text;
          background-size: 0 100%;
        }
      }
    }
  }

  // p {
  //   padding: 8px 0;
  //   line-height: 1.2;
  //   overflow-wrap: break-word;
  //   transition: @transition-normal !important;
  //   transition-property: color, font-size;
  // }
  // .lrc-active {
  //   color: var(--color-primary);
  //   font-size: 1.2em;
  // }
}

.lrcActiveZoom {
  :global {
    .line-content {
      &.active {
        .extended {
          font-size: .94em;
        }

        .line {
          font-size: 1.1em;
        }
      }
    }
  }
}

.skip {
  position: absolute;
  top: calc(34% + var(--playDetail-lrc-font-size, 16px) + 2px);
  left: 0;
  // height: 6px;
  width: 100%;
  pointer-events: none;

  // opacity: .5;
  .line {
    border-top: 1px dashed var(--color-primary);
    opacity: .3;
    margin-right: 30px;
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 15%, #fff 100%);
  }

  .label {
    position: absolute;
    right: 30px;
    top: -14px;
    line-height: 1.2;
    font-size: 12px;
    color: var(--color-primary);
    opacity: .76;
  }

  .skipBtn {
    position: absolute;
    right: 0;
    top: 0;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none !important;
    pointer-events: initial;
    transition: @transition-normal;
    transition-property: opacity;
    opacity: .8;

    &:hover {
      opacity: .6;
    }
  }
}

.lyricSelectContent {
  position: absolute;
  left: 0;
  top: 0;
  // text-align: center;
  height: 100%;
  width: 100%;
  font-size: var(--playDetail-lrc-font-size, 16px);
  z-index: 10;
  color: #555;
  padding: 16px 4px 30px;

  .lyricSelectline {
    padding: calc(var(--playDetail-lrc-font-size, 16px) / 2) 1px;
    overflow-wrap: break-word;
    transition: @transition-normal !important;
    transition-property: color, font-size;
    line-height: 1.42;
  }

  .lyricSelectlineExtended {
    font-size: 14px;
  }

  .lrcActive {
    color: var(--color-primary);
    font-weight: 600;
  }
}

.lyricSpace {
  height: 48%;
}
</style>
