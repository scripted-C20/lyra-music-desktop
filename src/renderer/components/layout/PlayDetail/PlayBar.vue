<template>
  <div :class="$style.footer">
    <div :class="$style.footerLeft">
      <div :class="$style.timeLabel">
        <span :class="$style.timeValueStart">{{ nowPlayTimeStr }}</span>
      </div>

      <div :class="$style.progressContainer">
        <common-progress-bar
          :class-name="$style.progress"
          :progress="progress"
          :handle-transition-end="handleTransitionEnd"
          :is-active-transition="isActiveTransition"
        />
      </div>

      <div :class="$style.timeLabel">
        <span :class="$style.timeValueEnd">{{ maxPlayTimeStr }}</span>
      </div>
    </div>

    <div :class="$style.playControl">
      <button type="button" :class="$style.playBtn" :aria-label="$t('player__prev')" @click="playPrev()">
        <line-icon :icon="SkipBack" :size="20" :class="$style.playIcon" />
      </button>
      <button type="button" :class="[$style.playBtn, $style.playBtnCenter]" :aria-label="isPlay ? $t('player__pause') : $t('player__play')" @click="togglePlay">
        <line-icon :icon="isPlay ? Pause : Play" :size="24" :class="[$style.playIcon, { [$style.isPlayIcon]: !isPlay }]" />
      </button>
      <button type="button" :class="$style.playBtn" :aria-label="$t('player__next')" @click="playNext()">
        <line-icon :icon="SkipForward" :size="20" :class="$style.playIcon" />
      </button>
    </div>

    <div :class="$style.footerRight">
      <control-btns />
    </div>
  </div>
</template>

<script setup>
import { playNext, playPrev, togglePlay } from '@renderer/core/player'
import { isPlay } from '@renderer/store/player/state'
import usePlayProgress from '@renderer/utils/compositions/usePlayProgress'
import { SkipBack, Play, Pause, SkipForward } from 'lucide-vue-next'
import LineIcon from '@renderer/components/common/LineIcon.vue'

import ControlBtns from './components/ControlBtns.vue'

const {
  nowPlayTimeStr,
  maxPlayTimeStr,
  progress,
  isActiveTransition,
  handleTransitionEnd,
} = usePlayProgress()
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.footer {
  --play-control-width: 148px;
  --play-control-gap: 18px;
  flex: 0 0 auto;
  width: var(--play-detail-shell-width, min(1524px, calc(100% - 120px)));
  height: 74px;
  margin: 0 auto 16px;
  padding: 10px 20px;
  overflow: hidden;
  position: relative;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(250, 249, 248, 0.78));
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    0 14px 30px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.64);
  backdrop-filter: blur(22px) saturate(1.08);
}

.footerLeft {
  position: absolute;
  left: 20px;
  right: calc(50% + var(--play-control-width) / 2 + var(--play-control-gap));
  top: 50%;
  transform: translateY(-50%);
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.playControl {
  width: var(--play-control-width);
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate3d(-50%, -50%, 0);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border-radius: 999px;
  padding: 0;
  box-shadow: none;
}

.playBtn {
  width: 38px;
  height: 38px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 0;
  opacity: .92;
  transition: transform .2s ease, opacity .2s ease, color .2s ease, box-shadow .2s ease, background-color .2s ease;
  color: var(--color-700);

  svg {
    opacity: .84;
    transition: opacity .2s ease;
  }

  &:hover {
    opacity: 1;
    transform: translateY(-1px);
    color: var(--ui-text-accent);
    background-color: var(--color-primary-alpha-900);

    svg {
      opacity: 1;
    }
  }

  &:active {
    transform: scale(0.96);
  }
}

.playBtnCenter {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark-200));
  color: #fff;
  box-shadow:
    0 10px 22px var(--color-primary-alpha-500),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);

  svg {
    fill: #fff;
    opacity: 1;
  }

  .isPlayIcon {
    transform: translateX(1px);
  }

  &:hover {
    background: linear-gradient(135deg, var(--color-primary-light-100), var(--color-primary));
    color: #fff;
    box-shadow:
      0 12px 24px var(--color-primary-alpha-400),
      inset 0 1px 0 rgba(255, 255, 255, 0.28);
  }
}

.progressContainer {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.progress {
  width: 100%;
  height: 7px;
}

.timeLabel {
  display: flex;
  align-items: center;
  flex-shrink: 0;

  span {
    font-size: 13px;
    color: var(--color-650);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}

.footerRight {
  position: absolute;
  left: calc(50% + var(--play-control-width) / 2 + var(--play-control-gap));
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
}

@media (max-width: 1140px) {
  .footer {
    --play-control-gap: 12px;
    width: var(--play-detail-shell-width, calc(100% - 56px));
    padding: 10px 16px;
  }

  .footerLeft {
    left: 16px;
  }

  .footerRight {
    right: 16px;
  }
}
</style>
