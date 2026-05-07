<template>
  <material-popup-btn ref="btn_ref" :class="$style.btnContent">
    <button :class="[$style.btn, {[$style.selected]: appSetting['player.togglePlayMethod'] != 'none'}]" :aria-label="nextTogglePlayName">
      <line-icon :icon="currentPlayModeIcon" :size="18" />
    </button>
    <template #content>
      <div :class="$style.setting">
        <button
          v-for="item in playModeOptions"
          :key="item.mode"
          :class="[$style.btn, $style.optionBtn, {[$style.selected]: appSetting['player.togglePlayMethod'] == item.mode}]"
          :aria-label="$t(item.label)"
          @click="toggleMode(item.mode)"
        >
          <line-icon :icon="item.icon" :size="18" />
        </button>
      </div>
    </template>
  </material-popup-btn>
</template>

<script setup>
import { computed, ref } from '@common/utils/vueTools'
import { CircleOff, ListMusic, Repeat, Repeat1, Shuffle } from 'lucide-vue-next'
import { appSetting } from '@renderer/store/setting'
import useNextTogglePlay from '@renderer/utils/compositions/useNextTogglePlay'
import LineIcon from './LineIcon.vue'

const btn_ref = ref(null)

const {
  nextTogglePlayName,
  toggleNextPlayMode,
} = useNextTogglePlay()

const playModeIconMap = {
  listLoop: Repeat,
  random: Shuffle,
  list: ListMusic,
  singleLoop: Repeat1,
  none: CircleOff,
}

const playModeOptions = [
  { mode: 'listLoop', icon: Repeat, label: 'player__play_toggle_mode_list_loop' },
  { mode: 'random', icon: Shuffle, label: 'player__play_toggle_mode_random' },
  { mode: 'list', icon: ListMusic, label: 'player__play_toggle_mode_list' },
  { mode: 'singleLoop', icon: Repeat1, label: 'player__play_toggle_mode_single_loop' },
  { mode: 'none', icon: CircleOff, label: 'player__play_toggle_mode_off' },
]

const currentPlayModeIcon = computed(() => {
  return playModeIconMap[appSetting['player.togglePlayMethod']] ?? CircleOff
})

const toggleMode = (mode) => {
  btn_ref.value.hide()
  toggleNextPlayMode(mode)
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

  svg {
    width: 18px;
    height: 18px;
    transition: opacity @transition-fast;
    opacity: .84;
  }
  &.selected {
    color: var(--ui-text-accent);
    background-color: var(--color-primary-light-300-alpha-800);
    box-shadow: inset 0 0 0 1px var(--color-primary-light-300-alpha-800);
    svg {
      opacity: 1;
    }
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
  flex-flow: row nowrap;
  font-size: var(--ui-font-body);
  gap: 8px;
  padding: 8px;

  .optionBtn {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background-color: rgba(0, 0, 0, 0.04);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.02);

    &:hover {
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }
  }
}


</style>
