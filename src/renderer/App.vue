<template>
  <div id="container" class="view-container">
    <layout-aside id="left" />
    <div id="right">
      <layout-toolbar id="toolbar" />
      <layout-view id="view" />
      <layout-play-bar id="player" />
    </div>
    <layout-icons />
    <layout-change-log-modal />
    <layout-update-modal />
    <layout-pact-modal />
    <layout-sync-mode-modal />
    <layout-sync-auth-code-modal />
    <layout-play-detail />
  </div>
</template>

<script setup>
import { onMounted } from '@common/utils/vueTools'
// import BubbleCursor from '@common/utils/effects/cursor-effects/bubbleCursor'
// import '@common/utils/effects/snow.min'
import useApp from '@renderer/core/useApp'

useApp()

onMounted(() => {
  document.getElementById('root').style.display = 'block'

  // const styles = getComputedStyle(document.documentElement)
  // window.lxData.bubbleCursor = new BubbleCursor({
  //   fillStyle: styles.getPropertyValue('--color-primary-alpha-900'),
  //   strokeStyle: styles.getPropertyValue('--color-primary-alpha-700'),
  // })
})

// onBeforeUnmount(() => {
//   window.lxData.bubbleCursor?.destroy()
// })

</script>


<style lang="less">
@import './assets/styles/index.less';
@import './assets/styles/layout.less';

html {
  height: 100vh;
}
html, body {
  // overflow: hidden;
  box-sizing: border-box;
}

body {
  user-select: none;
  height: 100%;
  background: transparent;
}
#root {
  height: 100%;
  position: relative;
  overflow: hidden;
  color: var(--color-font);
  transition: background-color @transition-normal;
  background-color: transparent;
  box-sizing: border-box;
  isolation: isolate;
}

.disableAnimation * {
  transition: none !important;
  animation: none !important;
}

.transparent {
  background: transparent;
  padding: @shadow-app;

  body,
  #root {
    background: transparent;
  }

  #root {
    border-radius: @radius-shell;
    clip-path: inset(0 round @radius-shell);
  }
}
.disableTransparent {
  background-color: transparent;

  body {
    background-color: var(--color-app-background);
    background-image: var(--background-image);
    background-position: var(--background-image-position);
    background-size: var(--background-image-size);
    background-repeat: no-repeat;
  }

  #root {
    border-radius: 0;
    clip-path: none;
  }

  #body {
    border: none;
  }

  #right {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  // #view { // 偏移5px距离解决非透明模式下右侧滚动条无法拖动的问题
  //   margin-right: 5Px;
  // }
}
.fullscreen {
  background-color: var(--color-app-background);

  body {
    background-color: var(--color-app-background);
    background-image: var(--background-image);
    background-position: var(--background-image-position);
    background-size: var(--background-image-size);
    background-repeat: no-repeat;
  }

  #root {
    border-radius: 0;
    clip-path: none;
  }

  #right {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
}

#container {
  position: relative;
  display: flex;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  background: var(--color-sidebar-background);
  border-radius: @radius-shell;
  clip-path: inset(0 round @radius-shell);
  background-clip: padding-box;
  box-shadow: 0 22px 58px rgba(15, 23, 42, 0.14);
  transform: translateZ(0);

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.18),
      inset 0 0 0 1.5px rgba(0, 0, 0, 0.045);
    pointer-events: none;
    z-index: 3;
  }
}

#left {
  flex: none;
  width: @width-app-left;
  background-color: var(--color-sidebar-background);
  border-right: 1px solid var(--ncm-divider);
  border-top-left-radius: @radius-shell;
  border-bottom-left-radius: @radius-shell;
  overflow: hidden;
}
#right {
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
  transition: background-color @transition-normal;
  background-color: var(--color-main-background);
  overflow: hidden;
  border-top-right-radius: @radius-shell;
  border-bottom-right-radius: @radius-shell;
}
#toolbar, #player {
  flex: none;
}
#toolbar {
  border-top-right-radius: @radius-shell;
}
#player {
  border-bottom-right-radius: @radius-shell;
}
#view {
  position: relative;
  flex: auto;
  // display: flex;
  min-height: 0;
}

.view-container {
  transition: opacity @transition-normal;
}
#root.show-modal > .view-container {
  opacity: .9;
}
#view.show-modal > .view-container {
  opacity: .2;
}

@media (max-width: 1120px) {
  .transparent #root {
    border-radius: 0;
    clip-path: none;
  }

  #container {
    border-radius: 0;
    box-shadow: none;
  }

  #left {
    width: 196px;
    border-radius: 0;
  }

  #right,
  #toolbar,
  #player {
    border-radius: 0;
  }
}

</style>
