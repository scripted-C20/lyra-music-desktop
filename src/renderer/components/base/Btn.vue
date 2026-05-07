<template>
  <button
    :class="[$style.btn, {[$style.min]: min}, {[$style.outline]: outline}]"
    tabindex="0"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script>
export default {
  props: {
    min: {
      type: Boolean,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 16px;
  border: 1px solid rgba(222, 222, 226, 0.98);
  border-radius: 999px;
  cursor: pointer;
  outline: none;
  transition: @transition-fast;
  transition-property: background-color, border-color, transform, box-shadow, color;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 244, 246, 0.98));
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  font-size: var(--ui-font-body);
  font-weight: 500;
  line-height: var(--ui-line-compact);
  color: var(--ui-text-secondary);
  &[disabled] {
    opacity: .4;
    cursor: default;
    box-shadow: none;
  }

  &.outline {
    background: transparent;
    box-shadow: none;
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
    box-shadow: 0 6px 12px rgba(15, 23, 42, 0.04);
  }
}

.min {
  min-height: 30px;
  padding: 0 14px;
  font-size: var(--ui-font-caption);
}

</style>
