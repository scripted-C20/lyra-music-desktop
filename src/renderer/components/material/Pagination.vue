<template>
  <div v-if="maxPage > 1" :class="$style.pagination">
    <ul>
      <li v-if="page == 1" :class="$style.disabled">
        <span>
          <line-icon :icon="ChevronLeft" :size="15" />
        </span>
      </li>
      <li v-else>
        <button type="button" :aria-label="$t('pagination__prev')" @click="handleClick(page - 1)">
          <line-icon :icon="ChevronLeft" :size="15" />
        </button>
      </li>
      <li v-if="maxPage > btnLength && page > pageEvg + 1" :class="$style.first">
        <button type="button" :aria-label="$t('pagination__page', { num: 1 })" @click="handleClick(1)">
          <line-icon :icon="ChevronsLeft" :size="15" />
        </button>
      </li>
      <li v-for="p in pages" :key="p" :class="{ [$style.active]: p == page }">
        <span v-if="p === page" v-text="page" />
        <button
v-else type="button" :aria-label="$t('pagination__page', { num: p })" @click="handleClick(p)"
          v-text="p"
/>
      </li>
      <li v-if="maxPage > btnLength && maxPage - page > pageEvg" :class="$style.last">
        <button type="button" :aria-label="$t('pagination__page', { num: maxPage })" @click="handleClick(maxPage)">
          <line-icon :icon="ChevronsRight" :size="15" />
        </button>
      </li>
      <li v-if="page == maxPage" :class="$style.disabled">
        <span>
          <line-icon :icon="ChevronRight" :size="15" />
        </span>
      </li>
      <li v-else>
        <button type="button" :aria-label="$t('pagination__next')" @click="handleClick(page + 1)">
          <line-icon :icon="ChevronRight" :size="15" />
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
import { ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight } from 'lucide-vue-next'

import { computed } from '@common/utils/vueTools'

export default {
  props: {
    count: {
      type: Number,
      default: 0,
    },
    limit: {
      type: Number,
      default: 10,
    },
    page: {
      type: Number,
      default: 1,
    },
    btnLength: {
      type: Number,
      default: 7,
    },
  },
  emits: ['btn-click'],
  setup(props, { emit }) {
    const maxPage = computed(() => {
      return Math.ceil(props.count / props.limit) || 1
    })
    const pageEvg = computed(() => {
      return Math.floor(props.btnLength / 2)
    })
    const pages = computed(() => {
      if (maxPage.value <= props.btnLength) return Array.from({ length: maxPage.value }, (_, i) => i + 1)
      let start = props.page - pageEvg.value > 1
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        ? maxPage.value - props.page < pageEvg.value + 1
          ? maxPage.value - (props.btnLength - 1)
          : props.page - pageEvg.value
        : 1
      return Array.from({ length: props.btnLength }, (_, i) => start + i)
    })

    const handleClick = (page) => {
      emit('btn-click', page)
    }

    return {
      maxPage,
      pageEvg,
      pages,
      handleClick,
      ChevronLeft,
      ChevronsLeft,
      ChevronsRight,
      ChevronRight,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.pagination {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(228, 228, 232, 0.98);
  background: linear-gradient(180deg, rgba(250, 250, 251, 0.98), rgba(244, 244, 246, 0.98));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78), 0 10px 22px rgba(15, 23, 42, 0.045);

  ul {
    display: flex;
    flex-flow: row wrap;
    gap: 4px;

    li {
      display: flex;
      line-height: 1;

      svg {
        height: .9em;
      }

      span,
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 34px;
        min-height: 34px;
        padding: 0 12px;
        line-height: 1;
        color: var(--ui-text-secondary);
        font-size: var(--ui-font-caption);
        font-weight: 500;
        border-radius: 999px;
      }

      &.active {
        span {
          background-color: rgba(255, 255, 255, 0.98);
          color: var(--ncm-red-dark);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
        }
      }

      button {
        background-color: transparent;
        border: none;
        cursor: pointer;
        outline: none;
        transition: @transition-fast;
        transition-property: background-color, color, transform;

        &:hover {
          color: var(--ui-text-primary);
          background-color: rgba(255, 255, 255, 0.72);
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
          background-color: rgba(239, 239, 242, 0.96);
        }
      }

      &.disabled {
        span {
          color: var(--ui-text-tertiary);
          opacity: .52;
        }
      }

      &:first-child,
      &:last-child,
      &.first,
      &.last {

        span,
        button {
          line-height: 0;
        }
      }
    }
  }
}
</style>
