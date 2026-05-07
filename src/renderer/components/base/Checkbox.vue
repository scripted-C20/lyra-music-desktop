<template>
  <div :class="$style.checkbox">
    <input
      :id="id" ref="dom_input" :type="need ? 'radio' : 'checkbox'" :aria-hidden="true" :checked="checked"
      :class="$style.input" :disabled="disabled" :value="value" :name="name" @input="handleInput($event.target.checked)"
    >
    <label :for="id" :class="$style.content">
      <div :class="[$style.container, need ? $style.radio : null]" :role="need ? 'radio' : 'checkbox'" tabindex="0" :aria-label="ariaLabel || label" :aria-checked="checked" :aria-disabled="disabled" @keydown.enter.space.stop.prevent="handleToggle"></div>
      <slot v-if="label == null" />
      <span v-else :class="$style.label">
        {{ label }}
      </span>
    </label>
  </div>
</template>

<script>
export default {
  props: {
    modelValue: {
      type: [String, Boolean, Number, Array],
      required: true,
    },
    value: {
      type: [String, Boolean, Number, Array],
      default: undefined,
    },
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: undefined,
    },
    need: {
      type: Boolean,
      default: false,
    },
    ariaLabel: {
      type: String,
      default: undefined,
    },
    label: {
      type: String,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      checked: false,
    }
  },
  watch: {
    modelValue(n) {
      this.setValue(n)
    },
  },
  mounted() {
    this.setValue(this.modelValue)
  },
  methods: {
    handleInput(checked) {
      let modelValue
      if (Array.isArray(this.modelValue)) {
        modelValue = [...this.modelValue]
        if (checked) modelValue.push(this.value)
        else {
          const index = modelValue.indexOf(this.value)
          if (index > -1) modelValue.splice(index, 1)
        }
      } else {
        if (typeof this.modelValue == 'boolean') {
          modelValue = checked
        } else modelValue = checked ? this.value : ''
      }
      this.$emit('update:modelValue', modelValue)
      this.$emit('change', modelValue)
    },
    setValue(value) {
      let checked
      if (Array.isArray(value)) {
        checked = value.includes(this.value)
      } else {
        if (typeof this.modelValue == 'boolean') {
          checked = this.modelValue
        } else if (value == null) checked = this.modelValue != ''
        else checked = this.modelValue == this.value
      }
      // console.log(this.need, this.value, checked)
      // this.checked = this.need ? checked && this.value : checked
      if (this.checked == checked) return
      this.checked = checked
    },
    handleToggle(event) {
      event.lx_handled = true
      if (this.need) {
        if (this.$refs.dom_input.checked) return
        this.$refs.dom_input.checked = true
        this.handleInput(true)
      } else {
        this.$refs.dom_input.checked = !this.$refs.dom_input.checked
        this.handleInput(this.$refs.dom_input.checked)
      }
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.checkbox {
  display: inline-flex;
  max-width: 100%;
}

.input {
  display: none;
  &[disabled] {
    + .content {
      opacity: .46;
      .container, .label {
        cursor: default;
      }
    }
  }
  &:checked {
    + .content {
      .container {
        transform: translateY(-1px);
        background: linear-gradient(180deg, var(--color-primary), var(--color-primary-dark-200));
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16), 0 8px 16px var(--color-primary-alpha-500);

        &:after {
          transform: scale(1);
          opacity: 1;
          background-color: #fff;
        }
      }
      .label {
        color: var(--color-font);
      }
    }
  }
}

.content {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  gap: 11px;
}

.container {
  flex: none;
  position: relative;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-radius: @radius-choice;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 247, 249, 0.98));
  box-shadow: inset 0 0 0 1.5px rgba(151, 155, 162, 0.68), 0 3px 8px rgba(15, 23, 42, 0.03);
  transition: @transition-fast;
  transition-property: transform, box-shadow, background-color, border-radius;

  &:after {
    content: '';
    display: block;
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background-color: #fff;
    transform: scale(0.35);
    opacity: 0;
    transition: 0.18s ease;
    transition-property: transform, opacity;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: inset 0 0 0 1.5px var(--color-primary-light-100-alpha-400), 0 6px 12px rgba(15, 23, 42, 0.05);
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-primary-alpha-500), 0 0 0 4px var(--color-primary-light-300-alpha-800);
  }
}

.radio {
  border-radius: 999px;
}

.label {
  flex: auto;
  min-width: 0;
  font-size: var(--ui-font-body);
  line-height: var(--ui-line-body);
  font-weight: 500;
  cursor: pointer;
  color: var(--ui-text-primary);
  letter-spacing: 0.01em;
  transition: color @transition-fast;
}

</style>
