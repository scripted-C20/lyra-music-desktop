<template>
  <component
    :is="icon"
    :size="size"
    :stroke-width="strokeWidth"
    :absolute-stroke-width="absoluteStrokeWidth"
    :class="$style.icon"
    aria-hidden="true"
    focusable="false"
  />
</template>

<script setup>
defineProps({
  icon: {
    type: [Object, Function],
    required: true,
  },
  size: {
    type: [Number, String],
    default: 18,
  },
  strokeWidth: {
    type: [Number, String],
    default: 1.9,
  },
  absoluteStrokeWidth: {
    type: Boolean,
    default: true,
  },
})
</script>

<style lang="less" module>
.icon {
  display: block;
  flex: none;
  color: currentColor;
}
</style>
