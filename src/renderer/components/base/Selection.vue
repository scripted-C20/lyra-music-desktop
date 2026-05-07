<template>
  <div ref="dom_root" class="content" :class="[$style.select, show ? $style.active : '']">
    <div ref="dom_btn" class="label-content" :class="$style.label" @click="handleShow">
      <span class="label">{{ label }}</span>
      <div class="icon" :class="$style.icon">
        <line-icon :icon="ChevronDown" :size="14" />
      </div>
    </div>
    <ul v-if="show" ref="dom_list" class="selection-list scroll" :class="$style.list" :style="listStyles">
      <li
        v-for="(item, index) in list" :key="index" :class="[$style.listItem, (itemKey ? item[itemKey] : item) == modelValue ? $style.active : null]"
        :aria-label="itemName ? item[itemName] : item" @click="handleClick(item)"
      >
        {{ itemName ? item[itemName] : item }}
      </li>
    </ul>
  </div>
</template>

<script>
import { ChevronDown } from 'lucide-vue-next'
import { markRaw } from 'vue'

export default {
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    modelValue: {
      type: [String, Number],
      required: true,
    },
    itemName: {
      type: String,
      default: '',
    },
    itemKey: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  setup() {
    return { ChevronDown: markRaw(ChevronDown) }
  },
  data() {
    return {
      hideTimer: null,
      show: false,
      listStyles: {
        transform: 'scaleY(0) translateY(0)',
      },
    }
  },
  computed: {
    activeIndex() {
      if (this.modelValue == null) return -1
      if (!this.itemName) return this.list.indexOf(this.modelValue)
      return this.list.findIndex(l => l[this.itemKey] == this.modelValue)
    },
    label() {
      if (this.modelValue == null) return ''
      if (this.itemName == null) return this.modelValue
      const item = this.list[this.activeIndex]
      if (!item) return ''
      return item[this.itemName]
    },
  },
  mounted() {
    document.addEventListener('pointerdown', this.handleDocumentPointerDown, true)
    document.addEventListener('click', this.handleDocumentClick, true)
    document.addEventListener('focusin', this.handleDocumentFocusIn, true)
    window.addEventListener('blur', this.handleWindowBlur)
  },
  beforeUnmount() {
    document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true)
    document.removeEventListener('click', this.handleDocumentClick, true)
    document.removeEventListener('focusin', this.handleDocumentFocusIn, true)
    window.removeEventListener('blur', this.handleWindowBlur)
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  },
  methods: {
    hideMenu() {
      if (!this.show) return
      this.listStyles.transform = 'scaleY(0) translateY(0)'
      if (this.hideTimer) clearTimeout(this.hideTimer)
      this.hideTimer = setTimeout(() => {
        this.hideTimer = null
        this.show = false
      }, 50)
    },
    isInnerTarget(target) {
      if (!(target instanceof Node)) {
        return false
      }
      const domBtn = this.$refs.dom_btn
      const domList = this.$refs.dom_list
      if (domBtn && (target === domBtn || domBtn.contains(target))) return true
      if (domList && (target === domList || domList.contains(target))) return true
      return false
    },
    handleDocumentPointerDown(e) {
      if (!this.show) return
      if (this.isInnerTarget(e.target)) return
      this.hideMenu()
    },
    handleDocumentClick(e) {
      if (!this.show) return
      if (this.isInnerTarget(e.target)) return
      this.hideMenu()
    },
    handleDocumentFocusIn(e) {
      if (!this.show) return
      if (this.isInnerTarget(e.target)) return
      this.hideMenu()
    },
    handleWindowBlur() {
      this.hideMenu()
    },
    handleClick(item) {
      const value = this.itemKey ? item[this.itemKey] : item
      if (value !== this.modelValue) {
        this.$emit('update:modelValue', value)
        this.$emit('change', item)
      }
      this.hideMenu()
    },
    handleShow() {
      if (this.show) {
        this.hideMenu()
        return
      }
      this.show = true
      this.$nextTick(() => {
        const domList = this.$refs.dom_list
        if (!domList) return

        this.listStyles.transform = `scaleY(1) translateY(${this.handleGetOffset(domList)}px)`

        const activeItem = domList.children[this.activeIndex]
        if (activeItem) domList.scrollTop = activeItem.offsetTop - domList.clientHeight * 0.38
      })
    },
    getScrollContainer(el) {
      let parent = el?.parentElement
      while (parent) {
        if (parent.scrollHeight > parent.clientHeight) return parent
        parent = parent.parentElement
      }
      return document.getElementById('view') ?? document.documentElement
    },
    handleGetOffset(domList = this.$refs.dom_list) {
      if (!domList) return 0

      const listHeight = domList.clientHeight
      const domSelect = domList.offsetParent || domList.parentElement
      if (!domSelect || !listHeight) return 0

      const domContainer = this.getScrollContainer(domSelect)
      if (!domContainer) return 0

      const containerHeight = domContainer.clientHeight
      if (!containerHeight || containerHeight < listHeight) return 0

      const gap = 8
      const selectRect = domSelect.getBoundingClientRect()
      const containerRect = domContainer.getBoundingClientRect
        ? domContainer.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight }
      const overflowBottom = selectRect.bottom + gap + listHeight - containerRect.bottom
      if (overflowBottom <= 0) return 0

      const availableTop = selectRect.top - containerRect.top - gap
      if (availableTop <= 0) return 0

      return -Math.min(overflowBottom + 5, availableTop)
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@selection-height: 28px;

.select {
  display: inline-block;
  font-size: var(--ui-font-body);
  position: relative;
  width: var(--selection-width, 300px);
  z-index: 20;

  &.active {
    .label {
      color: var(--ui-text-accent);
      border-color: var(--color-primary-light-100-alpha-400);
      background-color: rgba(255, 255, 255, 0.99);
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
    }
    .list {
      opacity: 1;
    }
    .icon {
      svg{
        transform: rotate(180deg);
      }
    }
  }
}

.label {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 244, 246, 0.98));
  border: 1px solid rgba(222, 222, 226, 0.98);
  padding: 0 15px;
  transition: @transition-normal;
  transition-property: background-color, border-color, box-shadow, transform;
  height: 36px;
  line-height: 1.5;
  box-sizing: border-box;
  color: var(--ui-text-secondary);
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  font-size: var(--ui-font-body);
  font-weight: 500;

  span {
    flex: auto;
    .mixin-ellipsis-1();
  }
  .icon {
    flex: none;
    margin-left: 7px;
    line-height: 0;
    svg {
      width: 1em;
      transition: transform .2s ease;
      transform: rotate(0);
    }
  }

  &:hover {
    color: var(--ui-text-accent);
    border-color: var(--color-primary-light-100-alpha-400);
    background-color: rgba(255, 255, 255, 0.98);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
    background-color: rgba(241, 241, 244, 0.98);
  }
}

.list {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(248, 248, 250, 0.995));
  opacity: 0;
  transform: scaleY(0) translateY(0);
  transform-origin: 0 0 0;
  transition: .25s ease;
  transition-property: transform, opacity;
  z-index: 40;
  border-radius: 22px;
  border: 1px solid rgba(226, 226, 229, 0.98);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.1);
  overflow: auto;
  max-height: 240px;
  padding: 8px;
  color: var(--ui-text-primary);
  backdrop-filter: blur(16px);
}
.listItem {
  cursor: pointer;
  min-height: 40px;
  padding: 8px 14px;
  line-height: 1.35;
  display: flex;
  align-items: center;
  outline: none;
  transition: @transition-fast;
  transition-property: background-color, color, transform, box-shadow;
  background-color: transparent;
  box-sizing: border-box;
  .mixin-ellipsis-1();
  border-radius: 14px;
  font-size: var(--ui-font-body);
  color: var(--ui-text-secondary);

  &:hover {
    background-color: var(--color-primary-light-300-alpha-800);
    color: var(--ui-text-primary);
    transform: translateX(1px);
  }
  &:active {
    background-color: var(--color-primary-light-100-alpha-400);
  }
  &.active {
    color: var(--ui-text-accent);
    background-color: var(--color-primary-alpha-900);
    box-shadow: inset 0 0 0 1px var(--color-primary-light-300-alpha-800);
  }
}


</style>
