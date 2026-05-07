<template>
  <material-popup-btn :class="$style.btnContent">
    <button :class="[$style.btn, { [$style.active]: playbackRate != 1 }]" :aria-label="`${$t('player__playback_rate')}${playbackRate}x`">
      <line-icon :icon="Gauge" :size="18" />
    </button>
    <template #content>
      <div :class="$style.setting">
        <div :class="$style.info">
          <span>{{ playbackRate.toFixed(2) }}x</span>
          <div :class="$style.control">
            <base-checkbox
              id="player__playback_preserves_pitch"
              :model-value="appSetting['player.preservesPitch']"
              :label="$t('player__playback_preserves_pitch')"
              @update:model-value="updatePreservesPitch"
            />
            <base-btn min @click="handleUpdatePlaybackRate(100)">{{ $t('player__playback_rate_reset_btn') }}</base-btn>
          </div>
        </div>
        <base-slider-bar :class="$style.slider" :value="playbackRate * 100" :min="50" :max="200" @change="handleUpdatePlaybackRate" />
      </div>
    </template>
  </material-popup-btn>
</template>

<script setup>
// import { computed } from '@common/utils/vueTools'
import { Gauge } from 'lucide-vue-next'
import { playbackRate } from '@renderer/store/player/playbackRate'
import { appSetting, updateSetting } from '@renderer/store/setting'
import LineIcon from './LineIcon.vue'

const handleUpdatePlaybackRate = (val) => {
  window.app_event.setPlaybackRate(Math.round(val) / 100)
}


const updatePreservesPitch = (enabled) => {
  updateSetting({ 'player.preservesPitch': enabled })
}

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.btnContent {
  flex: none;
  height: 100%;
}

.btn {
  position: relative;
  justify-content: center;
  align-items: center;
  transition: color @transition-normal, background-color @transition-fast, transform @transition-fast, box-shadow @transition-fast;
  cursor: pointer;
  background-color: transparent;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  flex-flow: column nowrap;
  padding: 0;
  color: var(--ui-text-secondary);

  svg {
    width: 18px;
    height: 18px;
    transition: opacity @transition-fast;
    opacity: .84;
  }
  &:hover {
    transform: translateY(-1px);
    background-color: var(--color-primary-light-300-alpha-800);
    box-shadow: inset 0 0 0 1px var(--color-primary-light-300-alpha-800);
    svg {
      opacity: 1;
    }
  }
  &:active {
    transform: scale(0.96);
    svg {
      opacity: 1;
    }
  }

  &.active {
    color: var(--ui-text-accent);
    background-color: var(--color-primary-light-300-alpha-800);
    box-shadow: inset 0 0 0 1px var(--color-primary-light-300-alpha-800);
    svg {
      opacity: 1;
    }
  }
}

.setting {
  display: flex;
  flex-flow: column nowrap;
  padding: 2px 3px;
  gap: 8px;
  width: 300px;
}

.info {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  font-size: var(--ui-font-body);
  color: var(--ui-text-primary);
  span {
    line-height: 1.2;
    font-weight: 600;
  }
}
.control {
  align-items: center;
  display: flex;
  gap: 10px;
}

.slider {
  width: 100%;
}


</style>
