<template>
  <ul :class="[$style.list, $style[align]]" role="tablist">
    <li
      v-for="item in list"
      :key="item[itemKey]" :class="[$style.listItem, {[$style.active]: modelValue == item[itemKey]}]" tabindex="-1" role="tab"
      :aria-label="item[itemLabel]" ignore-tip :aria-selected="modelValue == item[itemKey]" @click="handleToggle(item[itemKey])"
    >
      <span :class="$style.label">{{ item[itemLabel] }}</span>
    </li>
  </ul>
</template>

<script>

export default {
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    align: {
      type: String,
      default: 'left',
    },
    itemKey: {
      type: String,
      default: 'id',
    },
    itemLabel: {
      type: String,
      default: 'label',
    },
    modelValue: {
      type: [String, Number],
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const handleToggle = id => {
      if (id == props.modelValue) return
      emit('update:modelValue', id)
      emit('change', id)
    }

    return {
      handleToggle,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  display: inline-flex;
  flex-flow: row wrap;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(228, 228, 232, 0.98);
  background: linear-gradient(180deg, rgba(250, 250, 251, 0.98), rgba(244, 244, 246, 0.98));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78), 0 10px 22px rgba(15, 23, 42, 0.045);

  &.left {
    margin-right: auto;
  }
  &.center {
    margin-left: auto;
    margin-right: auto;
  }
  &.right {
    margin-left: auto;
  }
}
.listItem {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  transition: @transition-fast;
  transition-property: color, background-color, transform, box-shadow;
  color: var(--ui-text-secondary);
  font-size: var(--ui-font-caption);
  font-weight: 500;
  line-height: 1;

  &:hover {
    color: var(--ui-text-primary);
    background-color: rgba(255, 255, 255, 0.72);
    transform: translateY(-1px);
  }

  &.active {
    color: var(--ncm-red-dark);
    cursor: default;
    font-weight: 600;
    background-color: rgba(255, 255, 255, 0.98);
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
  }
}

.label {
  display: block;
  max-width: 100%;
  white-space: nowrap;
}
</style>
