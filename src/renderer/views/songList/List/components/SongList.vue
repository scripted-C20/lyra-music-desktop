<template>
  <div :class="$style.container">
    <div v-show="!props.listInfo.noItemLabel" ref="dom_list_ref" :class="$style.listContent" class="scroll">
      <ul>
        <li
          v-for="item in props.listInfo.list"
          :key="item.id"
          :class="$style.item"
          @click="toDetail(item)"
        >
          <div :class="$style.image">
            <img :class="$style.img" loading="lazy" decoding="async" :src="item.img">
          </div>
          <div :class="$style.desc">
            <h4>{{ item.name }}</h4>
            <div>
              <p :class="$style.author">{{ item.author }}</p>
              <p v-if="item.time" :class="$style.time">{{ item.time }}</p>
              <div :class="$style.songlistInfo">
                <span v-if="item.total != null" :class="$style.metric">
                  <line-icon :icon="ListMusic" :size="13" />
                  {{ item.total }}
                </span>
                <span v-if="visibleSource" :class="$style.metric">{{ item.source }}</span>
                <span v-if="item.play_count != null" :class="[$style.metric, $style.metricWide]">
                  <line-icon :icon="Play" :size="14" />
                  {{ item.play_count }}
                </span>
              </div>
            </div>
          </div>
        </li>
        <li v-for="(_, index) in 6" :key="`placeholder_${index}`" :class="$style.placeholderItem" />
      </ul>
      <div :class="$style.pagination">
        <material-pagination :count="props.listInfo.total" :limit="props.listInfo.limit" :page="props.listInfo.page" @btn-click="togglePage" />
      </div>
    </div>
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div v-show="props.listInfo.noItemLabel" :class="$style.noitem">
        <p v-text="props.listInfo.noItemLabel" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ListMusic, Play } from 'lucide-vue-next'

import { ref } from '@common/utils/vueTools'
import type { ListInfo, ListInfoItem } from '@renderer/store/songList/state'
import { useRoute, useRouter } from '@common/utils/vueRouter'

const props = withDefaults(defineProps<{
  listInfo: ListInfo
  visibleSource?: boolean
}>(), {
  visibleSource: false,
})

const router = useRouter()
const route = useRoute()

const dom_list_ref = ref<HTMLElement | null>(null)
const emit = defineEmits(['toggle-page'])

const togglePage = (page: number) => {
  emit('toggle-page', page)
}

const toDetail = (info: ListInfoItem) => {
  window.lx.songListInfo.currentDetailId = info.id
  void router.push({
    path: '/songList/detail',
    query: {
      source: info.source,
      id: info.id,
      picUrl: info.img,
      fromName: route.name as string,
    },
  })
}

defineExpose({
  scrollTo(top: number) {
    dom_list_ref.value?.scrollTo({
      top,
    })
  },
  getScrollTop() {
    return dom_list_ref.value?.scrollTop ?? 0
  },
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  overflow: hidden;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
}

.listContent {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  font-size: 14px;
  box-sizing: border-box;
  padding: 15px 15px 0;
  border-radius: 18px;
  background: var(--ncm-surface);
  border: 1px solid var(--ncm-divider);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);

  ul {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
  }
}

.item,
.placeholderItem {
  max-width: 360px;
  width: 32%;
  box-sizing: border-box;
}

.item {
  display: flex;
  margin-bottom: 20px;
  padding: 10px;
  border-radius: 18px;
  cursor: pointer;
  transition: background-color @transition-normal, transform @transition-normal, box-shadow @transition-normal, opacity @transition-normal;

  &:hover {
    background: rgba(198, 47, 47, 0.04);
    box-shadow: 0 12px 22px rgba(15, 23, 42, 0.05);
    transform: translateY(-1px);
  }
}

.placeholderItem {
  margin-bottom: 0;
  height: 0;
}

.image {
  flex: none;
  width: 40%;
  display: flex;
  border-radius: 14px;
  overflow: hidden;
  opacity: .94;
  aspect-ratio: 1 / 1;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.desc {
  flex: auto;
  padding: 2px 15px 2px 10px;
  overflow: hidden;

  h4 {
    font-size: 14px;
    line-height: 1.35;
    color: var(--ui-text-primary);
    .mixin-ellipsis-2();
  }
}

.songlistInfo {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--ui-text-secondary);
}

.metric {
  display: inline-flex;
  align-items: center;
  min-width: 0;

  svg {
    margin-right: 4px;
    flex: none;
  }
}

.metricWide {
  width: 100%;
}

.author {
  margin-top: 6px;
  font-size: 12px;
  .mixin-ellipsis-1();
  line-height: 1.3;
  color: var(--ui-text-secondary);
}

.time {
  margin-top: 3px;
  font-size: 12px;
  .mixin-ellipsis-1();
  line-height: 1.3;
  color: var(--ui-text-tertiary);
}

.pagination {
  text-align: center;
  padding: 15px 0;
}

.noitem {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  border-radius: 18px;
  background: var(--ncm-surface);
  border: 1px solid var(--ncm-divider);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);

  p {
    font-size: var(--ui-font-title);
    color: var(--ui-text-tertiary);
  }
}

@media (max-width: 1120px) {
  .item,
  .placeholderItem {
    width: 48.5%;
    max-width: none;
  }
}

@media (max-width: 780px) {
  .item,
  .placeholderItem {
    width: 100%;
  }
}
</style>
