<template>
  <div :class="$style.btns">
    <button
v-if="playBtn" type="button" :aria-label="$t('list__play')" @contextmenu.capture.stop
      @click.stop="handleClick('play')"
>
      <line-icon :icon="Play" :size="14" />
    </button>
    <button
v-if="listAddBtn" type="button" :aria-label="$t('list__add_to')" @contextmenu.capture.stop
      @click.stop="handleClick('listAdd')"
>
      <line-icon :icon="Plus" :size="14" />
    </button>
    <button
v-if="downloadBtn && appSetting['download.enable']" type="button" :aria-label="$t('list__download')"
      @contextmenu.capture.stop @click.stop="handleClick('download')"
>
      <line-icon :icon="Download" :size="14" />
    </button>
    <button
v-if="startBtn" type="button" :aria-label="$t('list__start')" @contextmenu.capture.stop
      @click.stop="handleClick('start')"
>
      <line-icon :icon="Play" :size="14" />
    </button>
    <button
v-if="pauseBtn" type="button" :aria-label="$t('list__pause')" @contextmenu.capture.stop
      @click.stop="handleClick('pause')"
>
      <line-icon :icon="Pause" :size="14" />
    </button>
    <button
v-if="fileBtn" type="button" :aria-label="$t('list__file')" @contextmenu.capture.stop
      @click.stop="handleClick('file')"
>
      <line-icon :icon="FileAudio" :size="14" />
    </button>
    <button
v-if="searchBtn" type="button" :aria-label="$t('list__search')" @contextmenu.capture.stop
      @click.stop="handleClick('search')"
>
      <line-icon :icon="Search" :size="14" />
    </button>
    <button v-if="removeBtn" type="button" :aria-label="$t('list__remove')" @click.stop="handleClick('remove')">
      <line-icon :icon="Trash2" :size="14" />
    </button>
  </div>
</template>

<script>
import { Play, Plus, Download, Pause, FileAudio, Search, Trash2 } from 'lucide-vue-next'

import { appSetting } from '@renderer/store/setting'

export default {
  props: {
    index: {
      type: Number,
      required: true,
    },
    startBtn: {
      type: Boolean,
      default: false,
    },
    pauseBtn: {
      type: Boolean,
      default: false,
    },
    removeBtn: {
      type: Boolean,
      default: false,
    },
    downloadBtn: {
      type: Boolean,
      default: true,
    },
    playBtn: {
      type: Boolean,
      default: true,
    },
    listAddBtn: {
      type: Boolean,
      default: true,
    },
    searchBtn: {
      type: Boolean,
      default: false,
    },
    fileBtn: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['btn-click'],
  setup() {
    return {
      appSetting,
      Play,
      Plus,
      Download,
      Pause,
      FileAudio,
      Search,
      Trash2,
    }
  },
  methods: {
    handleClick(action) {
      this.$emit('btn-click', { action, index: this.index })
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.btns {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.2;
  justify-content: center;
  opacity: 0.9;
  transition: opacity 0.18s ease;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(246, 246, 248, 0.995));
    border: 1px solid rgba(226, 226, 229, 0.94);
    border-radius: 999px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    color: var(--ui-text-secondary);
    outline: none;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.16s ease, box-shadow 0.16s ease;
    line-height: 0;
    box-shadow: 0 5px 12px rgba(15, 23, 42, 0.045);

    svg {
      height: 14px;
    }

    &:hover {
      color: var(--ui-text-accent);
      border-color: var(--color-primary-light-100-alpha-400);
      background-color: rgba(255, 255, 255, 0.995);
      box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
      transform: translateY(-1px);
    }

    &:active {
      background-color: rgba(241, 241, 244, 0.98);
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
      transform: scale(0.96);
    }

    &:focus-visible {
      color: var(--ui-text-accent);
      border-color: var(--color-primary-alpha-500);
      box-shadow: 0 0 0 3px var(--color-primary-light-300-alpha-800);
    }
  }
}
</style>
