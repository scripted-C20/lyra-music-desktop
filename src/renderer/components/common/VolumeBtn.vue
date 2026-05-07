<template>
  <material-popup-btn :class="$style.btnContent">
    <button :class="$style.btn" :aria-label="isMute ? $t('player__volume_muted') : `${$t('player__volume')}${parseInt(volume * 100)}%`" @wheel="handleWheel">
      <line-icon :icon="icon" :size="18" />
    </button>
    <template #content>
      <div :class="$style.setting">
        <div :class="$style.info">
          <span>{{ Math.trunc(volume * 100) }}%</span>
          <base-checkbox
            id="player__volume_mute"
            :model-value="isMute"
            :label="$t('player__volume_mute_label')"
            @update:model-value="saveVolumeIsMute($event)"
          />
        </div>
        <base-slider-bar :class="$style.slider" :value="volume" :min="0" :max="1" :step="0.01" @change="handleUpdateVolume" />
      </div>
    </template>
  </material-popup-btn>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'
import { Volume1, Volume2, VolumeOff, VolumeX } from 'lucide-vue-next'
// import useNextTogglePlay from '@renderer/utils/compositions/useNextTogglePlay'
// import useToggleDesktopLyric from '@renderer/utils/compositions/useToggleDesktopLyric'
// import { musicInfo, playMusicInfo } from '@renderer/store/player/state'
import { saveVolumeIsMute } from '@renderer/store/setting'
import { volume, isMute } from '@renderer/store/player/volume'
import LineIcon from './LineIcon.vue'

const handleWheel = (event) => {
  window.app_event.setVolume(Math.round(volume.value * 100 + (-event.deltaY / 100 * 2)) / 100)
}

const handleUpdateVolume = (val) => {
  window.app_event.setVolume(val)
}

const icon = computed(() => {
  return isMute.value
    ? VolumeX
    : volume.value == 0
      ? VolumeOff
      : volume.value < 0.35
        ? Volume1
        : Volume2
})

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
}

.setting {
  display: flex;
  flex-flow: column nowrap;
  padding: 12px 14px 14px;
  gap: 12px;
  width: 204px;
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

.slider {
  width: 100%;
}

</style>
