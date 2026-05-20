<template>
  <div :class="$style.view">
    <router-view v-slot="{ Component }">
      <!-- <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut"> -->
      <component :is="Component" class="view-container" />
      <!-- </transition> -->
    </router-view>
  </div>
</template>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.view {
  position: relative;
  z-index: 1;
  background-color: transparent;
  overflow: hidden;
  > :global(.view-container) {
    position: absolute !important;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    padding: 18px 24px 16px;
  }
}

</style>
