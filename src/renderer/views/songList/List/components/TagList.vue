<template>
  <div :class="[$style.tagList, {[$style.active]: popupVisible}]">
    <div ref="dom_btn" :class="$style.label" @click.stop="handleShow">
      <span>{{ tagName }}</span>
      <div :class="$style.icon">
        <line-icon :icon="ChevronDown" :size="14" />
      </div>
    </div>
    <div :class="$style.popup" :style="popupStyle" :aria-hidden="!popupVisible" @click.stop>
      <div :class="$style.list" class="scroll">
        <div :class="[$style.tag, !$props.tagId ? $style.activeTag : '']" @click="handleToggleTag('')">{{ $t('default') }}</div>
        <dl v-for="tagInfo in list" :key="tagInfo.name" :class="$style.group">
          <dt :class="$style.type">{{ tagInfo.name }}</dt>
          <dd
            v-for="tag in tagInfo.list"
            :key="tag.id"
            :class="[$style.tag, tag.id == $props.tagId ? $style.activeTag : '']"
            @click="handleToggleTag(tag.id)"
          >{{ tag.name }}</dd>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'

import { watch, shallowReactive, ref, onMounted, onBeforeUnmount, computed, reactive } from '@common/utils/vueTools'
import { setTags, getTags } from '@renderer/store/songList/action'
import { tags } from '@renderer/store/songList/state'
import { useRouter, useRoute } from '@common/utils/vueRouter'
import { useI18n } from '@renderer/plugins/i18n'

const props = defineProps({
  source: {
    type: String,
    required: true,
  },
  tagId: {
    type: String,
    required: true,
  },
  sortId: {
    type: [String, undefined],
    default: undefined,
  },
})

const router = useRouter()
const route = useRoute()
const t = useI18n()

const list = shallowReactive([])
const handleToggleTag = (id) => {
  void router.replace({
    path: route.path,
    query: {
      source: props.source,
      tagId: id,
      sortId: props.sortId,
    },
  })
  handleHide()
}
watch(() => props.source, async(source) => {
  if (!source) return
  // const source = (await getLeaderboardSetting()).source as LX.OnlineSource
  let tagInfo = tags[source]
  // console.log(await getTags(source))
  if (tagInfo == null) setTags(tagInfo = await getTags(source), source)

  list.splice(0, list.length, ...[{ name: window.i18n.t('songlist__tag_info_hot_tag'), list: [...tagInfo.hotTag] }, ...tagInfo.tags])
}, {
  immediate: true,
})
const tagName = computed(() => {
  if (!props.tagId) return t('default')
  for (const tags of list) {
    const tag = tags.list.find(t => t.id == props.tagId)
    if (tag) return tag.name
  }
  return props.tagId
})

const popupStyle = reactive({
  width: '720px',
  maxHeight: '420px',
})

const setTagPopupWidth = () => {
  window.setTimeout(() => {
    const dom_view = document.getElementById('view')
    const popupWidth = Math.max(320, Math.min(dom_view.clientWidth - 32, 820))
    popupStyle.width = popupWidth + 'px'
    popupStyle.maxHeight = Math.min(dom_view.clientHeight * 0.66, 460) + 'px'
  }, 50)
}

const dom_btn = ref<HTMLElement | null>(null)
const popupVisible = ref(false)
const handleShow = () => popupVisible.value = !popupVisible.value
const handleHide = (evt) => {
  // if (e && e.target.parentNode != this.$refs.dom_popup && this.show) return this.show = false
  // console.log(this.$refs)
  if (evt && (evt.target == dom_btn.value || dom_btn.value?.contains(evt.target))) return
  popupVisible.value = false
}


onMounted(() => {
  setTagPopupWidth()
  document.addEventListener('click', handleHide)
  window.addEventListener('resize', setTagPopupWidth)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleHide)
  window.removeEventListener('resize', setTagPopupWidth)
})

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.tagList {
  font-size: var(--ui-font-caption);
  position: relative;
  z-index: 24;

  &.active {
    .label {
      color: var(--ui-text-accent);
      border-color: rgba(198, 47, 47, 0.26);
      background-color: rgba(255, 255, 255, 0.99);
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
      .icon {
        svg{
          transform: rotate(180deg);
        }
      }
    }
    .popup {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
  }
}

.label {
  min-height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(222, 222, 226, 0.98);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 244, 246, 0.98));
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  transition: @transition-normal;
  transition-property: background-color, border-color, box-shadow, color, transform;
  box-sizing: border-box;
  text-align: center;
  color: var(--ui-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  font-size: var(--ui-font-caption);
  font-weight: 500;

  span {
    flex: auto;
    .mixin-ellipsis-1();
  }
  .icon {
    flex: none;
    margin-left: 8px;
    line-height: 0;
    svg {
      width: .92em;
      transition: transform .2s ease;
      transform: rotate(0);
    }
  }

  &:hover {
    color: var(--ui-text-accent);
    border-color: rgba(198, 47, 47, 0.26);
    background-color: rgba(255, 255, 255, 0.98);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
    background-color: rgba(241, 241, 244, 0.98);
  }
}

.popup {
  position: absolute;
  top: calc(100% + 10px);
  width: 720px;
  left: 0;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(247, 247, 249, 0.995));
  border: 1px solid rgba(226, 226, 229, 0.98);
  opacity: 0;
  transform: translateY(-6px) scale(.98);
  transform-origin: 0 0 0;
  transition: .25s ease;
  transition-property: transform, opacity;
  max-height: 420px;
  z-index: 60;
  pointer-events: none;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.1);
  display: flex;
  overflow: hidden;
  backdrop-filter: blur(16px);
}
.list {
  width: 100%;
  padding: 18px;
  box-sizing: border-box;
}

.group {
  margin: 0;
}

.type {
  margin: 2px 0 10px;
  color: var(--ui-text-tertiary);
  font-size: var(--ui-font-caption);
  font-weight: 600;
}

.tag {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  margin: 0 8px 10px 0;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 999px;
  background-color: rgba(198, 47, 47, 0.05);
  color: var(--ui-text-secondary);
  transition: @transition-fast;
  transition-property: background-color, color, transform, box-shadow, border-color;
  cursor: pointer;

  &:hover {
    background-color: rgba(198, 47, 47, 0.09);
    color: var(--ui-text-primary);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
    background-color: rgba(198, 47, 47, 0.14);
  }
}

.activeTag {
  color: var(--ui-text-accent);
  border-color: rgba(198, 47, 47, 0.12);
  background-color: rgba(198, 47, 47, 0.12);
  box-shadow: 0 10px 22px rgba(198, 47, 47, 0.12);
}

</style>
