<template>
  <div :class="[$style.content, $style[`content_${variant}`]]" data-player-detail-ignore="true" @click="handleShowPopup" @mouseenter="handlMsEnter" @mouseleave="handlMsLeave">
    <div ref="dom_btn" :class="[$style.timeContent, $style[`timeContent_${variant}`]]">
      <template v-if="variant == 'full'">
        <div :class="$style.fullProgressRow">
          <div :class="[$style.progress, $style.progress_full]">
            <div :class="[$style.progressBar, {[$style.barTransition]: isActiveTransition}]" :style="{ transform: `scaleX(${progress || 0})` }" @transitionend="handleTransitionEnd" />
          </div>
        </div>
        <div :class="$style.fullTimeRow">
          <span>{{ nowPlayTimeStr }}</span>
          <span>{{ maxPlayTimeStr }}</span>
        </div>
      </template>
      <template v-else-if="variant == 'middle'">
        <span>{{ nowPlayTimeStr }}</span>
        <div :class="[$style.progress, $style.progress_middle]">
          <div :class="[$style.progressBar, {[$style.barTransition]: isActiveTransition}]" :style="{ transform: `scaleX(${progress || 0})` }" @transitionend="handleTransitionEnd" />
        </div>
        <span>{{ maxPlayTimeStr }}</span>
      </template>
      <template v-else>
        <span>{{ nowPlayTimeStr }}</span>
        <span style="margin: 0 1px;">/</span>
        <span>{{ maxPlayTimeStr }}</span>
        <div :class="$style.progress">
          <div :class="[$style.progressBar, {[$style.barTransition]: isActiveTransition}]" :style="{ transform: `scaleX(${progress || 0})` }" @transitionend="handleTransitionEnd" />
        </div>
      </template>
      <base-popup v-model:visible="visible" :btn-el="dom_btn" @mouseenter="handlMsEnter" @mouseleave="handlMsLeave" @transitionend="handleTranEnd">
        <div :class="[$style.popupProgress, $style[`popupProgress_${variant}`]]">
          <common-progress-bar v-if="visibleProgress" :progress="progress" :handle-transition-end="handleTransitionEnd" :is-active-transition="isActiveTransition" />
        </div>
      </base-popup>
    </div>
  </div>
</template>

<script>
import { ref } from '@common/utils/vueTools'
import usePlayProgress from '@renderer/utils/compositions/usePlayProgress'
import { isShowPlayerDetail } from '@renderer/store/player/state'

export default {
  props: {
    variant: {
      type: String,
      default: 'mini',
    },
  },
  setup() {
    const visible = ref(false)
    const visibleProgress = ref(false)
    const dom_btn = ref(null)

    const handleShowPopup = (evt) => {
      if (visible.value) {
        evt.stopPropagation()
        handlMsLeave()
      } else handlMsEnter()
    }
    const {
      nowPlayTimeStr,
      maxPlayTimeStr,
      progress,
      isActiveTransition,
      handleTransitionEnd,
    } = usePlayProgress()

    let timeout = null
    const handlMsEnter = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      if (visible.value) return
      timeout = setTimeout(() => {
        visible.value = true
        visibleProgress.value = true
      }, 100)
    }
    const handlMsLeave = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      if (!visible.value) return
      timeout = setTimeout(() => {
        timeout = null
        visible.value = false
      }, 100)
    }
    const handleTranEnd = () => {
      if (visible.value) return
      visibleProgress.value = false
    }

    // onMounted(() => {
    //   visible.value = true
    //   requestAnimationFrame(() => {
    //     visible.value = false
    //   })
    // })

    return {
      visible,
      visibleProgress,
      dom_btn,
      handleShowPopup,
      nowPlayTimeStr,
      maxPlayTimeStr,
      progress,
      isActiveTransition,
      handleTransitionEnd,
      handlMsLeave,
      handlMsEnter,
      handleTranEnd,
      isShowPlayerDetail,
    }
  },
}

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
// .content {
//   flex: none;
//   position: relative;
//   // display: inline-block;
//   padding: 5px 0;
//   color: var(--color-300);
//   font-size: 13px;
//   cursor: pointer;
//   transition: opacity @transition-fast;

//   &:hover {
//     opacity: .7;
//   }
// }
.content {
  flex: none;
  position: relative;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  padding: 0 0 1px;
  &:hover {
    .progress {
      opacity: 1;
      transform: scaleY(1.04);
    }
  }
}
.content_middle {
  padding-top: 1px;
}
.content_full {
  padding-top: 0;

  &:hover {
    .progress_full {
      opacity: 1;
      transform: scaleY(1.06);
    }
  }
}
.timeContent {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ui-text-secondary);
  font-size: var(--ui-font-meta);
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  min-height: 18px;

  > span:first-child,
  > span:last-of-type {
    min-width: 40px;
    text-align: center;
  }
}
.timeContent_middle {
  gap: 10px;

  > span {
    min-width: 40px;
    text-align: center;
  }
}
.timeContent_full {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-height: 30px;
}
.fullProgressRow {
  width: 100%;
}
.fullTimeRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 0 1px;

  > span {
    min-width: 40px;
  }
}

.progress {
  position: relative;
  width: auto;
  flex: 1 1 auto;
  margin-top: 0;
  height: 6px;
  opacity: 1;
  overflow: hidden;
  transition: @transition-normal;
  transition-property: background-color, opacity, transform, box-shadow;
  background: linear-gradient(180deg, rgba(242, 243, 246, 0.98), rgba(233, 235, 239, 0.98));
  border: 1px solid rgba(223, 227, 232, 0.96);
  border-radius: 999px;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.14), 0 3px 8px rgba(15, 23, 42, 0.06);

  &:before {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0));
    pointer-events: none;
  }

  .progressBar {
    height: 100%;
    width: 100%;
    position: relative;
    z-index: 1;
    background: linear-gradient(90deg, var(--color-primary-dark-200) 0%, var(--color-primary) 58%, var(--color-primary-dark-200) 100%);
    transform-origin: 0;
    will-change: transform;
    box-shadow: 0 0 12px var(--color-primary-alpha-500);
    border-radius: inherit;
  }

  .barTransition {
    transition-property: transform;
    transition-timing-function: ease-out;
    transition-duration: 0.2s;
  }
}
.progress_middle {
  height: 7px;
}
.progress_full {
  width: 100%;
  height: 8px;
  flex: none;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.16), 0 4px 10px rgba(15, 23, 42, 0.07);
}

.popupProgress {
  position: relative;
  width: 432px;
  height: 18px;
  box-sizing: border-box;
  padding: 4px 2px 3px;
  margin: 0 10px;
}
.popupProgress_middle {
  width: 480px;
}
.popupProgress_full {
  width: 560px;
}


</style>
