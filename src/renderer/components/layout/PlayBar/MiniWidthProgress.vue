<template>
  <div :class="[$style.player, $style[`player_${resolvedVariant}`]]" @click="handlePlayerClick">
    <div :class="$style.trackMeta">
      <div :class="[$style.picContent, showLoadingEffect ? $style.picLoading : null]" :aria-label="$t('player__pic_tip')" @contextmenu="handleToMusicLocation">
        <img v-if="musicInfo.pic" :class="$style.picImg" :src="musicInfo.pic" decoding="async" @error="imgError">
        <div v-else :class="$style.emptyPic">L<span>X</span></div>
        <div v-if="showLoadingEffect" :class="$style.loadingOverlay">
          <span :class="$style.loadingRing"></span>
        </div>
      </div>
      <div :class="$style.infoContent">
        <div :class="$style.title" :aria-label="title + $t('copy_tip')" @contextmenu.prevent="handleCopy(title)">
          {{ title || 'LX Music' }}
        </div>
        <div :class="$style.status">{{ subtitle }}</div>
      </div>
    </div>
    <div :class="$style.centerStage">
      <div :class="$style.playBtnContent" data-player-detail-ignore="true">
        <button
type="button" :class="[$style.playBtn, $style.smallBtn]" :aria-label="$t('player__prev')"
          @click="playPrev()"
>
          <line-icon :icon="SkipBack" :size="18" :class="$style.transportIcon" />
        </button>
        <button
type="button" :class="[$style.playBtn, $style.primaryBtn, isPrimaryLoadingAction ? $style.primaryBtnLoading : null]"
          :aria-label="primaryBtnLabel" @click="handlePrimaryAction"
>
          <line-icon
:icon="primaryBtnIcon" :size="20"
            :class="[$style.transportIcon, $style.transportIconPrimary, isPrimaryLoadingAction ? $style.transportIconStop : null]"
/>
        </button>
        <button
type="button" :class="[$style.playBtn, $style.smallBtn]" :aria-label="$t('player__next')"
          @click="playNext()"
>
          <line-icon :icon="SkipForward" :size="18" :class="$style.transportIcon" />
        </button>
      </div>
      <play-progress :variant="resolvedVariant" :class="[$style.progressWrap, $style[`progressWrap_${resolvedVariant}`]]" data-player-detail-ignore="true" />
    </div>

    <div :class="$style.actionArea">
      <control-btns data-player-detail-ignore="true" />
    </div>
  </div>
</template>

<script>
import { SkipBack, SkipForward, Play, Pause, Square } from 'lucide-vue-next'

import ControlBtns from './ControlBtns.vue'
import PlayProgress from './PlayProgress.vue'
import { useRouter } from '@common/utils/vueRouter'
import { clipboardWriteText } from '@common/utils/electron'
import {
  isPlay,
  isPlayLoading,
  musicInfo,
  playInfo,
  playMusicInfo,
  statusText,
} from '@renderer/store/player/state'
import {
  setMusicInfo,
  setShowPlayerDetail,
} from '@renderer/store/player/action'
import { togglePlay, playNext, playPrev } from '@renderer/core/player'
import { computed } from '@common/utils/vueTools'
import { appSetting } from '@renderer/store/setting'
import { LIST_IDS } from '@common/constants'
import { formatMusicName } from '@renderer/utils'

export default {
  name: 'CorePlayBar',
  components: {
    ControlBtns,
    PlayProgress,
  },
  props: {
    variant: {
      type: String,
      default: 'mini',
    },
  },
  setup(props) {
    const router = useRouter()
    const title = computed(() => {
      return musicInfo.name
        ? formatMusicName(appSetting['download.fileName'], musicInfo.name, musicInfo.singer)
        : ''
    })
    const subtitle = computed(() => {
      const values = [musicInfo.singer, musicInfo.album].filter(Boolean)
      return values.length ? values.join('  ·  ') : statusText.value
    })
    const showPlayerDetail = () => {
      if (!playMusicInfo.musicInfo) return
      setShowPlayerDetail(true)
    }
    const handlePlayerClick = (event) => {
      if (!(event.target instanceof HTMLElement)) return
      if (event.target.closest('[data-player-detail-ignore="true"], button, a, input, textarea, select, label')) return
      showPlayerDetail()
    }

    const resolvedVariant = computed(() => {
      return ['mini', 'middle', 'full'].includes(props.variant) ? props.variant : 'mini'
    })
    const showLoadingEffect = computed(() => {
      return !!musicInfo.id && isPlayLoading.value
    })
    const isPrimaryLoadingAction = computed(() => {
      return showLoadingEffect.value && !isPlay.value
    })
    const primaryBtnIcon = computed(() => {
      if (isPrimaryLoadingAction.value) return Square
      return isPlay.value ? Pause : Play
    })
    const primaryBtnLabel = computed(() => {
      if (isPrimaryLoadingAction.value) return window.i18n.t('player__cancel_loading')
      return isPlay.value ? window.i18n.t('player__pause') : window.i18n.t('player__play')
    })
    const handlePrimaryAction = () => {
      togglePlay()
    }
    const handleCopy = (text) => {
      if (!text) return
      clipboardWriteText(text)
    }
    const imgError = () => {
      setMusicInfo({ pic: null })
    }
    const handleToMusicLocation = () => {
      const listId = playMusicInfo.listId
      if (!listId || listId == LIST_IDS.DOWNLOAD || !playMusicInfo.musicInfo) return
      if (playInfo.playIndex == -1) return
      void router.push({
        path: '/list',
        query: {
          id: listId,
          scrollIndex: playInfo.playIndex,
        },
      })
    }

    return {
      SkipBack,
      SkipForward,
      Play,
      Pause,
      Square,
      handlePlayerClick,
      showPlayerDetail,
      isPlay,
      handlePrimaryAction,
      togglePlay,
      playNext,
      playPrev,
      resolvedVariant,
      showLoadingEffect,
      isPrimaryLoadingAction,
      primaryBtnIcon,
      primaryBtnLabel,
      musicInfo,
      title,
      subtitle,
      handleCopy,
      imgError,
      handleToMusicLocation,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.player {
  position: relative;
  height: @height-player;
  border-top: 1px solid var(--ncm-divider);
  box-sizing: border-box;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 16px 3px;
  overflow: visible;
  z-index: 2;
  cursor: pointer;

  * {
    box-sizing: border-box;
  }

  &:before {
    .mixin-after();
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 247, 249, 0.985));
    opacity: 1;
    z-index: -1;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.76),
      0 -10px 30px rgba(15, 23, 42, 0.03);
  }
}
.player_middle {
  gap: 14px;
  padding-top: 6px;

  .actionArea {
    width: 24%;
  }

  .trackMeta {
    width: 24%;
  }

  .centerStage {
    gap: 6px;
  }

  .playBtnContent {
    padding-left: 12px;
    padding-right: 12px;
  }
}
.player_mini {
  .actionArea {
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }
}
.player_full {
  gap: 14px;
  padding-top: 7px;
  padding-bottom: 5px;

  .actionArea {
    width: 22%;
  }

  .trackMeta {
    width: 22%;
  }

  .centerStage {
    gap: 6px;
  }

  .playBtnContent {
    padding-left: 12px;
    padding-right: 12px;
  }
}

.centerStage {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0;
}

.trackMeta {
  width: 28%;
  min-width: 0;
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  opacity: .92;
  transition: opacity @transition-fast, transform @transition-fast;

  &:hover {
    opacity: 1;
    transform: translateX(1px);
  }
}

.picContent {
  position: relative;
  width: 48px;
  height: 48px;
  flex: none;
  display: flex;
  justify-content: center;
  align-items: center;
  isolation: isolate;

  &:before {
    .mixin-after();
    inset: -3px;
    border-radius: 17px;
    background: radial-gradient(circle, var(--color-primary-alpha-400), transparent 70%);
    opacity: 0;
    transform: scale(0.92);
    transition: opacity @transition-fast, transform @transition-fast;
    z-index: -1;
  }
}

.picImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
}

.emptyPic {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.34), transparent 34%),
    linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark-200) 100%);
  color: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  font-size: 18px;
  font-family: Consolas, "Courier New", monospace;
  box-shadow: 0 10px 20px var(--color-primary-alpha-400);

  span {
    padding-left: 3px;
  }
}

.picLoading {
  &:before {
    opacity: 1;
    transform: scale(1);
    animation: coverGlow 1.6s ease-in-out infinite;
  }

  .picImg,
  .emptyPic {
    animation: coverPulse 1.6s ease-in-out infinite;
  }
}

.loadingOverlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 14px;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(17, 24, 39, 0.08), rgba(17, 24, 39, 0.22)),
    linear-gradient(120deg, transparent 18%, rgba(255, 255, 255, 0.28) 42%, transparent 66%);
  background-size: auto, 180% 100%;
  background-position: 0 0, 120% 0;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: coverShimmer 1.25s linear infinite;
}

.loadingRing {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.34);
  border-top-color: rgba(255, 255, 255, 0.96);
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  animation: coverSpin 0.85s linear infinite;
}

.infoContent {
  min-width: 0;
  max-width: 230px;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  gap: 4px;
}

.title {
  max-width: 100%;
  font-size: 14px;
  color: var(--ui-text-primary);
  font-weight: 700;
  line-height: var(--ui-line-compact);
  .mixin-ellipsis-1();
}

.status {
  width: 100%;
  font-size: var(--ui-font-caption);
  color: var(--ui-text-tertiary);
  line-height: var(--ui-line-compact);
  .mixin-ellipsis-1();
}

.playBtnContent {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  cursor: default;
  gap: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 246, 248, 0.98));
  border: 1px solid rgba(228, 228, 232, 0.94);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}

.progressWrap {
  width: min(560px, 100%);
  min-width: 230px;
  margin-top: 0;
  padding: 0 2px;
  margin-bottom: 0;
  cursor: default;
}
.progressWrap_middle {
  width: min(700px, 100%);
  min-width: 280px;
}
.progressWrap_full {
  width: min(860px, 100%);
  min-width: 320px;
  padding: 0;
}

.actionArea {
  width: 28%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex: none;
  cursor: inherit;
}

.playBtn {
  flex: none;
  width: 36px;
  height: 36px;
  transition: @transition-fast;
  transition-property: color, opacity, transform, background-color, box-shadow;
  color: var(--ui-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: none;
  padding: 0;
  background: transparent;

  svg {
    width: 15px;
    height: 15px;
  }

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.96);
  }
}

.transportIcon {
  display: block;
  flex: none;
  width: 16px;
  height: 16px;
}

.transportIconPrimary {
  width: 18px;
  height: 18px;
}

.transportIconStop {
  width: 16px;
  height: 16px;
}

.smallBtn {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(246, 246, 248, 0.995));
  border: 1px solid rgba(226, 226, 229, 0.96);
  color: var(--ui-text-secondary);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);

  &:hover {
    color: var(--ui-text-accent);
    background-color: rgba(255, 255, 255, 0.995);
    border-color: var(--color-primary-light-100-alpha-400);
    box-shadow: 0 14px 24px rgba(15, 23, 42, 0.08);
  }
}

.primaryBtn {
  width: 48px;
  height: 48px;
  background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-dark-200) 100%);
  color: #fff;
  box-shadow: 0 14px 26px var(--color-primary-alpha-500);

  svg {
    width: 17px;
    height: 17px;
  }

  &:hover {
    box-shadow: 0 16px 28px var(--color-primary-alpha-600);
  }
}

.primaryBtnLoading {
  background:
    radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.2), transparent 42%),
    linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-dark-200) 100%);
  box-shadow:
    0 14px 26px var(--color-primary-alpha-500),
    0 0 0 6px rgba(198, 47, 47, 0.08);
  animation: loadingBtnPulse 1.25s ease-in-out infinite;
}

@keyframes coverSpin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes coverShimmer {
  from {
    background-position: 0 0, 120% 0;
  }

  to {
    background-position: 0 0, -40% 0;
  }
}

@keyframes coverPulse {
  0%, 100% {
    transform: scale(1);
    filter: saturate(1);
  }

  50% {
    transform: scale(0.97);
    filter: saturate(0.92);
  }
}

@keyframes coverGlow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(0.94);
  }

  50% {
    opacity: 0.9;
    transform: scale(1.04);
  }
}

@media (max-width: 1180px) {

  .actionArea {
    width: 30%;
  }

  .trackMeta {
    width: 30%;
  }

  .infoContent {
    max-width: 180px;
  }
}

@media (max-width: 980px) {
  .player {
    gap: 14px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .actionArea {
    width: auto;
  }

  .trackMeta {
    display: none;
  }

  .progressWrap {
    min-width: 200px;
  }
}

@keyframes loadingBtnPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      0 14px 26px var(--color-primary-alpha-500),
      0 0 0 6px rgba(198, 47, 47, 0.08);
  }

  50% {
    transform: scale(0.97);
    box-shadow:
      0 18px 30px var(--color-primary-alpha-600),
      0 0 0 10px rgba(198, 47, 47, 0.12);
  }
}
</style>
