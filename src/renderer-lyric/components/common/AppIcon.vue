<template>
  <component
    :is="resolvedIcon || 'svg'"
    :size="resolvedIcon ? size : null"
    :stroke-width="resolvedIcon ? strokeWidth : null"
    :absolute-stroke-width="resolvedIcon ? absoluteStrokeWidth : null"
    :width="resolvedIcon ? null : size"
    :height="resolvedIcon ? null : size"
    :viewBox="resolvedIcon ? null : fallbackViewBox"
    :class="$style.icon"
    aria-hidden="true"
    focusable="false"
  >
    <use v-if="!resolvedIcon && fallbackId" :xlink:href="fallbackId" />
  </component>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'
import { normalizeLucideIconName, resolveLegacyIconViewBox, resolveLucideIcon } from '@common/icons/lucideIconMap'

const props = defineProps({
  name: {
    type: String,
    default: '',
  },
  icon: {
    type: [String, Object, Function],
    default: '',
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

const resolvedIcon = computed(() => {
  if (props.icon && typeof props.icon != 'string') return props.icon
  return resolveLucideIcon(props.icon || props.name)
})

const fallbackId = computed(() => {
  const name = normalizeLucideIconName(props.icon || props.name)
  return name ? `#icon-${name}` : ''
})

const fallbackViewBox = computed(() => {
  return resolveLegacyIconViewBox(props.icon || props.name) || '0 0 24 24'
})
</script>

<style lang="less" module>
.icon {
  display: block;
  flex: none;
  color: currentColor;
  overflow: visible;
}
</style>
