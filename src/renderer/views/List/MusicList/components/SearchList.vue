<template>
  <teleport to="#view">
    <div v-show="isShow" ref="dom_container" :class="$style.container">
      <transition enter-active-class="animated-fast zoomIn" leave-active-class="animated zoomOut" @after-leave="handleAnimated">
        <div v-show="visible" :class="$style.search">
          <div :class="$style.form">
            <input
              ref="dom_input" v-model.trim="text" class="ignore-esc" :placeholder="placeholder" @input="handleDelaySearch"
              @keydown.arrow-down.arrow-up.prevent @keyup.arrow-down.prevent.exact="handleKeyDown" @keyup.arrow-up.prevent.exact="handleKeyUp"
              @keyup.enter="handleTemplistClick(selectIndex)"
              @keyup.escape.prevent.exact="handleKeyEsc" @keydown.control.prevent="handle_key_mod_down" @keydown.meta.prevent="handle_key_mod_down"
              @keyup.control.prevent="handle_key_mod_up" @keyup.meta.prevent="handle_key_mod_up" @contextmenu="handleContextMenu"
            >
            <button type="button" @click="handleHide">
              <slot>
                <line-icon :icon="Trash2" :size="15" />
              </slot>
            </button>
          </div>
          <div v-if="resultList" ref="dom_scrollContainer" class="scroll" :class="$style.list" :style="listStyle">
            <ul ref="dom_list">
              <li v-for="(item, index) in resultList" :key="item.songmid" :class="selectIndex === index ? $style.select : null" @mouseenter="selectIndex = index" @click="handleTemplistClick(index)">
                <div :class="$style.img" />
                <div :class="$style.meta">
                  <h3 :class="$style.name">{{ item.name }} - {{ item.singer }}</h3>
                  <h3 v-if="item.meta.albumName" :class="$style.albumName">{{ item.meta.albumName }}</h3>
                </div>
                <div :class="$style.source">{{ item.source }}</div>
              </li>
            </ul>
          </div>
        </div>
      </transition>
    </div>
  </teleport>
</template>

<script>
import { Trash2 } from 'lucide-vue-next'
import { markRaw } from 'vue'

import { debounce } from '@common/utils'
import { clipboardReadText } from '@common/utils/electron'
import { toRaw } from '@common/utils/vueTools'

export default {
  props: {
    placeholder: {
      type: String,
      default: 'Search for something...',
    },
    list: {
      type: Array,
      default() {
        return []
      },
    },
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['action'],
  setup() {
    return { Trash2: markRaw(Trash2) }
  },
  data() {
    return {
      text: '',
      selectIndex: -1,
      listStyle: {
        height: 0,
        maxHeight: 0,
        overflow: 'hidden',
      },
      maxHeight: 0,
      resultList: [],
      isModDown: false,
      isShow: false,
    }
  },
  watch: {
    resultList(n) {
      if (this.selectIndex > -1) this.selectIndex = -1
      this.$nextTick(() => {
        const height = this.$refs.dom_list.scrollHeight
        if (height > this.maxHeight) {
          this.listStyle.height = this.maxHeight + 'px'
          this.listStyle.overflow = 'auto'
        } else {
          this.listStyle.height = height + 'px'
          this.listStyle.overflow = 'hidden'
        }
      })
    },
    list(n) {
      if (!this.visible) return
      this.handleDelaySearch()
    },
    visible(n) {
      if (!n) return
      this.isShow = true
      this.init()
    },
  },
  created() {
    this.handleDelaySearch = debounce(() => {
      this.handleSearch()
    })
    if (this.visible) this.isShow = true
  },
  mounted() {
    this.init()
    // window.key_event.on('key_mod_down', this.handle_key_mod_down)
    // window.key_event.on('key_mod_up', this.handle_key_mod_up)
    window.key_event.on('key_mod+f_down', this.handle_key_mod_f_down)
  },
  beforeUnmount() {
    // window.key_event.off('key_mod_down', this.handle_key_mod_down)
    // window.key_event.off('key_mod_up', this.handle_key_mod_up)
    window.key_event.off('key_mod+f_down', this.handle_key_mod_f_down)
  },
  methods: {
    init() {
      if (!this.visible) return
      this.handleSearch()
      this.$nextTick(() => {
        if (!this.listStyle.maxHeight) {
          this.maxHeight = this.$refs.dom_container.offsetParent.clientHeight - this.$refs.dom_list.offsetTop - 70
          this.listStyle.maxHeight = this.maxHeight + 'px'
        }
        this.$refs.dom_input.focus()
      })
    },
    handleKeyEsc() {
      if (this.text.length > 0) {
        this.text = ''
        this.resultList = []
      } else {
        this.handleHide()
      }
    },
    handle_key_mod_down() {
      console.log('handle_key_mod_down')
      this.isModDown ||= true
    },
    handle_key_mod_up() {
      this.isModDown &&= false
    },
    handle_key_mod_f_down() {
      if (this.visible) this.$refs.dom_input.focus()
    },
    handleAnimated() {
      if (this.visible) return
      this.isShow = false
    },
    handleTemplistClick(index) {
      if (index < 0) return
      const id = this.resultList[index].id
      this.sendEvent('listClick', {
        index: this.list.findIndex(m => m.id == id),
        isPlay: this.isModDown,
      })
    },
    handleHide() {
      this.sendEvent('hide')
    },
    sendEvent(action, data) {
      this.$emit('action', {
        action,
        data,
      })
    },
    handleKeyDown() {
      if (this.resultList.length) {
        this.selectIndex = this.selectIndex + 1 < this.resultList.length ? this.selectIndex + 1 : 0
        this.handleScrollList()
      } else if (this.selectIndex > -1) {
        this.selectIndex = -1
      }
    },
    handleKeyUp() {
      if (this.resultList.length) {
        this.selectIndex = this.selectIndex - 1 < -1 ? this.resultList.length - 1 : this.selectIndex - 1
        this.handleScrollList()
      } else if (this.selectIndex > -1) {
        this.selectIndex = -1
      }
    },
    handleScrollList() {
      if (this.selectIndex < 0) return
      let dom = this.$refs.dom_list.children[this.selectIndex]
      let offsetTop = dom.offsetTop
      let scrollTop = this.$refs.dom_scrollContainer.scrollTop
      let top
      if (offsetTop < scrollTop) {
        top = offsetTop
      } else if (offsetTop + dom.clientHeight > this.$refs.dom_scrollContainer.clientHeight + scrollTop) {
        top = offsetTop + dom.clientHeight - this.$refs.dom_scrollContainer.clientHeight
      } else return
      this.$refs.dom_scrollContainer.scrollTo(0, top)
    },
    handleContextMenu() {
      let str = clipboardReadText()
      str = str.trim()
      str = str.replace(/\t|\r\n|\n|\r/g, ' ')
      str = str.replace(/\s+/g, ' ')
      let dom_input = this.$refs.dom_input
      const text = dom_input.value
      // if (dom_input.selectionStart == dom_input.selectionEnd) {
      const value = text.substring(0, dom_input.selectionStart) + str + text.substring(dom_input.selectionEnd, text.length)
      // event.target.value = value
      this.text = value
      // } else {
      //   clipboardWriteText(text.substring(dom_input.selectionStart, dom_input.selectionEnd))
      // }
    },
    async handleSearch() {
      if (!this.text.length) return this.resultList = []
      this.resultList = await window.lx.worker.main.searchListMusic(toRaw(this.list), this.text)
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 14px;
  width: min(620px, 58%);
  min-width: 360px;
  height: auto;
  z-index: 99;
}

.search {
  position: absolute;
  width: 100%;
  border-radius: @radius-shell;
  transition: box-shadow .24s ease, background-color @transition-normal, border-color @transition-normal;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
  border: 1px solid rgba(228, 228, 232, 0.98);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 247, 249, 0.98));
  box-shadow: 0 26px 56px rgba(15, 23, 42, 0.14);

  .form {
    display: flex;
    min-height: 44px;
    position: relative;
    padding: 0 4px 0 6px;
    input {
      flex: auto;
      background-color: transparent;
      border: none;
      outline: none;
      min-width: 0;
      padding: 0 12px 0 14px;
      overflow: hidden;
      font-size: var(--ui-font-body);
      line-height: 44px;
      color: var(--ui-text-primary);
      font-weight: 500;
      &::placeholder {
        color: var(--ui-text-tertiary);
      }
    }
    button {
      flex: none;
      border: none;
      background-color: transparent;
      outline: none;
      cursor: pointer;
      width: 38px;
      height: 38px;
      margin: 3px 0;
      padding: 9px;
      color: var(--ui-text-tertiary);
      transition: background-color .2s ease, color .2s ease, transform .2s ease;
      border-radius: 999px;

      &:hover {
        color: var(--ncm-red-dark);
        background-color: rgba(198, 47, 47, 0.08);
        transform: translateY(-1px);
      }
      &:active {
        transform: translateY(0);
        background-color: rgba(198, 47, 47, 0.14);
      }
    }
  }
  .list {
    font-size: var(--ui-font-caption);
    transition: .22s ease;
    height: 0;
    transition-property: height, opacity;
    position: relative;
    scroll-behavior: smooth;
    padding: 0 6px 6px;
    border-top: 1px solid rgba(228, 228, 232, 0.92);
    background: rgba(248, 248, 250, 0.94);

    li {
      position: relative;
      cursor: pointer;
      padding: 12px 14px;
      transition: background-color .18s ease, transform .18s ease, box-shadow .18s ease;
      line-height: var(--ui-line-compact);
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      gap: 12px;
      border-radius: 14px;
      color: var(--ui-text-secondary);

      &.select {
        background-color: rgba(198, 47, 47, 0.08);
        box-shadow: inset 0 0 0 1px rgba(198, 47, 47, 0.08);
        transform: translateX(1px);
      }
    }
  }
}

.img {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(216, 78, 78, 0.96), rgba(186, 39, 39, 0.96));
  box-shadow: 0 0 0 5px rgba(198, 47, 47, 0.08);
}
.meta {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.name {
  .mixin-ellipsis-1();
  font-size: var(--ui-font-body);
  color: var(--ui-text-primary);
  font-weight: 600;
}
.albumName {
  .mixin-ellipsis-1();
  font-size: var(--ui-font-meta);
  color: var(--ui-text-tertiary);
  .mixin-ellipsis-1();
}
.source {
  flex: none;
  min-width: 44px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(198, 47, 47, 0.08);
  color: var(--ncm-red-dark);
  font-size: var(--ui-font-meta);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
}

@media (max-width: 960px) {
  .container {
    width: min(92vw, 560px);
    min-width: 0;
  }
}

</style>
