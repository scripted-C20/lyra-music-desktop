<template>
  <div :class="$style.controlBtn">
    <!-- <common-volume-bar /> -->
    <button :class="$style.titleBtn" :aria-label="$t('player__add_music_to')" @click="addMusicTo">
      <line-icon :icon="ListPlus" :size="17" />
    </button>
    <button :class="[$style.titleBtn, {[$style.selected]: appSetting['desktopLyric.enable']}]" :aria-label="toggleDesktopLyricBtnTitle" @click="toggleDesktopLyric" @contextmenu="toggleLockDesktopLyric">
      <line-icon :icon="desktopLyricIcon" :size="17" />
    </button>
    <common-volume-btn />
    <common-toggle-play-mode-btn />
    <common-list-add-modal v-model:show="isShowAddMusicTo" :music-info="playMusicInfo.musicInfo" />
  </div>
</template>

<script>
import { computed, ref } from '@common/utils/vueTools'
import { Captions, CaptionsOff, ListPlus } from 'lucide-vue-next'
import LineIcon from '@renderer/components/common/LineIcon.vue'
import useToggleDesktopLyric from '@renderer/utils/compositions/useToggleDesktopLyric'
import { musicInfo, playMusicInfo } from '@renderer/store/player/state'
import { appSetting } from '@renderer/store/setting'

export default {
  components: {
    LineIcon,
  },
  setup() {
    const isShowAddMusicTo = ref(false)
    const {
      toggleDesktopLyricBtnTitle,
      toggleDesktopLyric,
      toggleLockDesktopLyric,
    } = useToggleDesktopLyric()
    const desktopLyricIcon = computed(() => {
      return appSetting['desktopLyric.enable'] ? Captions : CaptionsOff
    })
    const addMusicTo = () => {
      if (!musicInfo.id) return
      isShowAddMusicTo.value = true
    }
    return {
      appSetting,
      isShowAddMusicTo,
      toggleDesktopLyricBtnTitle,
      toggleDesktopLyric,
      toggleLockDesktopLyric,
      desktopLyricIcon,
      ListPlus,
      addMusicTo,
      playMusicInfo,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.controlBtn {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(247, 247, 249, 0.97));
  border: 1px solid rgba(228, 228, 232, 0.94);
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);

  button {
    color: var(--ui-text-secondary);
  }
}

.titleBtn {
  flex: none;
  width: 40px;
  height: 40px;
  transition: @transition-fast;
  transition-property: color, opacity, background-color, transform, box-shadow;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  border: none;
  padding: 0;
  border-radius: 999px;
  opacity: .84;
  cursor: pointer;

  svg {
    width: 17px;
    height: 17px;
  }

  &.selected {
    color: var(--ui-text-accent);
    background-color: var(--color-primary-light-300-alpha-800);
    box-shadow: inset 0 0 0 1px var(--color-primary-light-300-alpha-800);
    opacity: 1;
  }

  &:hover {
    opacity: 1;
    transform: translateY(-1px);
    background-color: var(--color-primary-light-300-alpha-800);
    box-shadow: inset 0 0 0 1px var(--color-primary-light-300-alpha-800);
  }
  &:active {
    opacity: 1;
    transform: scale(0.96);
  }
}


</style>
