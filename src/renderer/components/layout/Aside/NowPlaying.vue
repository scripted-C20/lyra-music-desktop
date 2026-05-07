<template>
  <div :class="$style.card" @click="handleShowDetail">
    <div :class="$style.picContent" :aria-label="$t('player__pic_tip')" @contextmenu="handleToMusicLocation">
      <img v-if="musicInfo.pic" :src="musicInfo.pic" decoding="async" @error="imgError">
      <div v-else :class="$style.emptyPic">L<span>X</span></div>
    </div>
    <div :class="$style.infoContent">
      <div :class="$style.title" :aria-label="title + $t('copy_tip')" @contextmenu.prevent="handleCopy(title)">
        {{ title || 'LX Music' }}
      </div>
      <div :class="$style.status">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script>
import { computed } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { clipboardWriteText } from '@common/utils/electron'
import {
  musicInfo,
  playInfo,
  playMusicInfo,
  statusText,
} from '@renderer/store/player/state'
import {
  setMusicInfo,
  setShowPlayerDetail,
} from '@renderer/store/player/action'
import { appSetting } from '@renderer/store/setting'
import { LIST_IDS } from '@common/constants'
import { formatMusicName } from '@renderer/utils'

export default {
  name: 'AsideNowPlaying',
  setup() {
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
    const handleCopy = (text) => {
      if (!text) return
      clipboardWriteText(text)
    }
    const imgError = () => {
      setMusicInfo({ pic: null })
    }
    const handleShowDetail = () => {
      if (!playMusicInfo.musicInfo) return
      setShowPlayerDetail(true)
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
      musicInfo,
      title,
      subtitle,
      handleCopy,
      imgError,
      handleShowDetail,
      handleToMusicLocation,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.card {
  flex: none;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 4px 0;
  padding: 10px;
  border-radius: 18px;
  cursor: pointer;
  -webkit-app-region: no-drag;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(248, 248, 250, 0.96));
  border: 1px solid rgba(229, 229, 232, 0.9);
  box-shadow:
    0 12px 26px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.66);
  transition: transform @transition-fast, border-color @transition-fast, box-shadow @transition-fast;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--color-primary-light-100-alpha-400);
    box-shadow:
      0 16px 30px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
  }
}

.picContent {
  width: 46px;
  height: 46px;
  flex: none;
  display: flex;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
  }
}

.emptyPic {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background-color: var(--color-primary-alpha-900);
  color: var(--color-primary-dark-100-alpha-100);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  font-size: 18px;
  font-family: Consolas, "Courier New", monospace;

  span {
    padding-left: 3px;
  }
}

.infoContent {
  min-width: 0;
  flex: 1 1 auto;
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
  letter-spacing: 0.01em;
  .mixin-ellipsis-1();
}

.status {
  width: 100%;
  font-size: var(--ui-font-caption);
  color: var(--ui-text-tertiary);
  line-height: var(--ui-line-compact);
  .mixin-ellipsis-1();
}
</style>
