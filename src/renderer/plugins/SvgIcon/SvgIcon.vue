<template>
  <app-icon :name="name" class="svg-icon" />
</template>

<script>
import AppIcon from '@renderer/components/common/AppIcon.vue'

export default {
  name: 'SvgIcon',
  components: {
    AppIcon,
  },
  props: {
    name: {
      type: String,
      required: true,
    },
  },
}
</script>

<style>
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1em;
  height: 1.1em;
  vertical-align: middle;
  overflow: visible;
  flex: none;
}
</style>
