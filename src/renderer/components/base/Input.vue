<template>
  <input
    ref="dom_input"
    :class="$style.input"
    :type="type"
    :placeholder="placeholder"
    :value="modelValue"
    :disabled="disabled"
    tabindex="0"
    @input="handleInput"
    @change="$emit('change', $event.target.value.trim())"
    @keyup.enter="$emit('submit', $event.target.value.trim())"
    @contextmenu="handleContextMenu"
  >
</template>

<script>
import { clipboardReadText } from '@common/utils/electron'

export default {
  props: {
    placeholder: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: [String, Number],
      default: '',
    },
    type: {
      type: String,
      default: 'text',
    },
    trim: {
      type: Boolean,
      default: true,
    },
    stopContentEventPropagation: {
      type: Boolean,
      default: true,
    },
    autoPaste: {
      type: Boolean,
      default: true,
    },
    // bindValue: {
    //   type: Boolean,
    //   default: true,
    // },
  },
  emits: ['update:modelValue', 'submit', 'change'],
  methods: {
    handleInput(event) {
      let value = event.target.value
      if (this.trim) {
        value = value.trim()
        event.target.value = value
      }
      this.$emit('update:modelValue', value)
    },
    focus() {
      this.$refs.dom_input.focus()
    },
    handleContextMenu(event) {
      if (this.stopContentEventPropagation) event.stopPropagation()
      if (!this.autoPaste) return
      let dom_input = this.$refs.dom_input
      if (dom_input.selectionStart === null) return
      let str = clipboardReadText()
      str = str.trim()
      str = str.replace(/\t|\r\n|\n|\r/g, ' ')
      str = str.replace(/\s+/g, ' ')
      const text = dom_input.value
      // if (dom_input.selectionStart == dom_input.selectionEnd) {
      const value = text.substring(0, dom_input.selectionStart) + str + text.substring(dom_input.selectionEnd, text.length)
      event.target.value = value
      this.$emit('update:modelValue', value)
      // } else {
      //   clipboardWriteText(text.substring(dom_input.selectionStart, dom_input.selectionEnd))
      // }
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.input {
  display: inline-block;
  border: 1px solid rgba(222, 222, 226, 0.98);
  border-radius: @radius-field;
  padding: 9px 12px;
  color: var(--color-button-font);
  outline: none;
  transition: @transition-fast;
  transition-property: background-color, border-color, box-shadow;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 247, 249, 0.96));
  font-size: var(--ui-font-body);
  line-height: var(--ui-line-body);
  color: var(--ui-text-primary);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[disabled] {
    opacity: .4;
  }

  &:hover, &:focus {
    border-color: var(--color-primary-light-100-alpha-400);
    background-color: rgba(255, 255, 255, 0.98);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.07);
  }
  &:active {
    background-color: rgba(244, 244, 246, 0.98);
  }
}

.min {
  padding: 3px 8px;
  font-size: var(--ui-font-caption);
}

</style>
