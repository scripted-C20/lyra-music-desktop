<template lang="pug">
div(:class="$style.footerLeftControlBtns" @click.stop)
  button(:class="[$style.footerLeftControlBtn, $style.lrcBtn]" :aria-label="toggleDesktopLyricBtnTitle" @click="toggleDesktopLyric" @contextmenu="toggleLockDesktopLyric")
    line-icon(:icon="desktopLyricIcon" :size="18")
  button(:class="[$style.footerLeftControlBtn, { [$style.active]: isShowPlayComment }]" :aria-label="$t('comment__show')" @click="toggleVisibleComment")
    line-icon(:icon="MessageSquareText" :size="18")
  common-volume-btn
  common-toggle-play-mode-btn
  button(:class="[$style.footerLeftControlBtn, $style.moreBtn, { [$style.active]: isShowMore }]" aria-label="更多" ignore-tip @click="handleToggleMore")
    line-icon(:icon="Ellipsis" :size="19")
  transition(enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut")
    div(v-if="isShowMore" :class="$style.moreInline" data-player-detail-ignore="true" @click.stop)
      button(:class="[$style.footerLeftControlBtn, { [$style.active]: isShowLrcSelectContent }]" :aria-label="$t('lyric__select')" @click="toggleVisibleLrc")
        line-icon(:icon="Text" :size="18")
      button(:class="[$style.footerLeftControlBtn, { [$style.active]: appSetting['player.audioVisualization'] }]" :aria-label="$t('audio_visualization')" @click="toggleAudioVisualization")
        line-icon(:icon="AudioLines" :size="18")
      common-playback-rate-btn
      common-sound-effect-btn
      button(:class="$style.footerLeftControlBtn" :aria-label="$t('player__add_music_to')" @click="handleShowAddMusicTo")
        line-icon(:icon="ListPlus" :size="18")
  common-list-add-modal(v-model:show="isShowAddMusicTo" :music-info="playMusicInfo.musicInfo")

</template>

<script>
import { computed, ref } from '@common/utils/vueTools'
import { AudioLines, Captions, CaptionsOff, Ellipsis, ListPlus, MessageSquareText, Text } from 'lucide-vue-next'
import { useI18n } from '@renderer/plugins/i18n'
import LineIcon from '@renderer/components/common/LineIcon.vue'

import {
  isShowLrcSelectContent,
  isShowPlayComment,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setShowPlayLrcSelectContentLrc,
  setShowPlayComment,
} from '@renderer/store/player/action'

import useToggleDesktopLyric from '@renderer/utils/compositions/useToggleDesktopLyric'
import { dialog } from '@renderer/plugins/Dialog'
import { setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, setEnableAudioVisualization } from '@renderer/store/setting'

export default {
  components: {
    LineIcon,
  },
  setup() {
    const t = useI18n()
    // const setting = useRefGetter('setting')
    // const setAudioVisualization = useCommit('setAudioVisualization')
    // const saveMediaDeviceId = useCommit('setMediaDeviceId')

    const toggleVisibleLrc = () => {
      setShowPlayLrcSelectContentLrc(!isShowLrcSelectContent.value)
    }
    const toggleVisibleComment = () => {
      setShowPlayComment(!isShowPlayComment.value)
    }
    const {
      toggleDesktopLyricBtnTitle,
      toggleDesktopLyric,
      toggleLockDesktopLyric,
    } = useToggleDesktopLyric()

    const isShowAddMusicTo = ref(false)
    const isShowMore = ref(true)
    const desktopLyricIcon = computed(() => {
      return appSetting['desktopLyric.enable'] ? Captions : CaptionsOff
    })
    const handleToggleMore = () => {
      isShowMore.value = !isShowMore.value
    }
    const handleShowAddMusicTo = () => {
      isShowAddMusicTo.value = true
      isShowMore.value = false
    }

    const toggleAudioVisualization = async() => {
      const newSetting = !appSetting['player.audioVisualization']
      if (newSetting && appSetting['player.mediaDeviceId'] != 'default') {
        const confirm = await dialog.confirm({
          message: t('setting__player_audio_visualization_tip'),
          cancelButtonText: t('cancel_button_text'),
          confirmButtonText: t('confirm_button_text'),
        })
        if (!confirm) return
        await setMediaDeviceId('default').catch(_ => _)
        saveMediaDeviceId('default')
      }
      setEnableAudioVisualization(newSetting)
    }

    return {
      appSetting,
      isShowLrcSelectContent,
      toggleVisibleLrc,
      isShowPlayComment,
      toggleVisibleComment,
      toggleDesktopLyricBtnTitle,
      toggleDesktopLyric,
      toggleLockDesktopLyric,
      toggleAudioVisualization,
      isShowAddMusicTo,
      isShowMore,
      handleToggleMore,
      handleShowAddMusicTo,
      playMusicInfo,
      desktopLyricIcon,
      Captions,
      CaptionsOff,
      AudioLines,
      Text,
      MessageSquareText,
      ListPlus,
      Ellipsis,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.footerLeftControlBtns {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 4px;
  min-width: 0;

  button {
    color: var(--color-700);
  }

  .footerLeftControlBtn {
    flex: none;
    width: 36px;
    height: 36px;
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

    svg {
      opacity: .84;
      transition: opacity .2s ease;
    }

    &:hover {
      opacity: 1;
      transform: translateY(-1px);
      color: var(--color-800);
      background-color: var(--color-primary-light-300-alpha-800);
      box-shadow: inset 0 0 0 1px var(--color-primary-light-300-alpha-800);

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

    &:active {
      transform: scale(0.96);
    }
  }

  .lrcBtn {
    width: 36px;
  }
}

.moreBtn {
  color: var(--color-700);
}

.moreInline {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 4px;
  margin-left: 2px;
  padding-left: 8px;
  border-radius: 999px;
  border-left: 1px solid rgba(15, 23, 42, 0.08);

  .footerLeftControlBtn {
    width: 36px;
    height: 36px;
  }
}
</style>
