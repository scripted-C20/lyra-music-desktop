<template>
  <div :class="[$style.aside, { [$style.fullscreen]: isFullscreen }]">
    <div :class="$style.userArea">
      <div :class="$style.avatar">LX</div>
      <div :class="$style.userMeta">
        <span :class="$style.productName">LX Music</span>
      </div>
    </div>
    <NavBar />
    <div :class="$style.versionBar">
      <span :class="$style.versionLine" aria-hidden="true" />
      <strong :class="$style.versionValue">v{{ versionInfo.version }}</strong>
      <span :class="$style.versionLine" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup>
import { isFullscreen, versionInfo } from '@renderer/store'
import NavBar from './NavBar.vue'

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.aside {
  transition: @transition-normal;
  transition-property: background-color;
  -webkit-app-region: drag;
  -webkit-user-select: none;
  display: flex;
  flex-flow: column nowrap;
  padding: 12px 8px 0;

  &.fullscreen {
    -webkit-app-region: no-drag;
    .logo {
      display: none;
    }
  }
}

.logo {
  box-sizing: border-box;
  padding: 0 13%;
  height: 50px;
  color: #fff;
  opacity: .9;
  flex: none;
  text-align: center;
  line-height: 50px;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 2px;
}

.userArea {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 12px;
  margin: 0 4px 14px;
  padding: 14px;
  -webkit-app-region: no-drag;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(250, 250, 251, 0.96));
  border: 1px solid rgba(229, 229, 232, 0.92);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark-200) 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  box-shadow: 0 10px 24px var(--color-primary-alpha-500);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.userMeta {
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
}

.productName {
  font-size: 16px;
  line-height: var(--ui-line-compact);
  color: var(--ui-text-primary);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.versionBar {
  flex: none;
  height: @height-player;
  margin: 0 4px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  -webkit-app-region: no-drag;
  color: var(--ui-text-tertiary);
  opacity: .72;
}

.versionLine {
  width: 28px;
  height: 1px;
  background: linear-gradient(90deg, transparent, currentColor);
  opacity: .34;

  &:last-child {
    background: linear-gradient(90deg, currentColor, transparent);
  }
}

.versionValue {
  min-width: 0;
  color: var(--ui-text-tertiary);
  font-size: var(--ui-font-caption);
  line-height: var(--ui-line-compact);
  font-weight: 700;
  letter-spacing: .03em;
  .mixin-ellipsis-1();
}

</style>
