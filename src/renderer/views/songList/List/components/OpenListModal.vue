<template>
  <material-modal :show="props.modelValue" teleport="#view" width="min(720px, 92%)" @close="emit('update:model-value', $event)" @after-enter="$refs.input.focus()">
    <main class="scroll" :class="$style.main">
      <h2>{{ $t('songlist__import_input_title') }}</h2>
      <div :class="$style.inputContent">
        <base-selection v-model="source" :class="$style.select" :list="props.sourceList" item-key="id" item-name="name" />
        <base-input
          ref="input"
          v-model.trim="text"
          :class="$style.input"
          :placeholder="$t('songlist__import_input_tip')"
          @submit="handleSubmit"
        />
      </div>
      <div :class="$style.footer">
        <div :class="$style.tips">
          <ul>
            <li>{{ $t('songlist__import_input_tip_1') }}</li>
            <li>{{ $t('songlist__import_input_tip_2') }}</li>
            <li>{{ $t('songlist__import_input_tip_3') }}</li>
            <li>
              {{ $t('songlist__import_input_tip_4') }}
              <span
                class="hover underline"
                aria-label="https://lyswhut.github.io/lx-music-doc/desktop/faq/cannot-open-songlist"
                @click="openUrl('https://lyswhut.github.io/lx-music-doc/desktop/faq/cannot-open-songlist')"
              >FAQ</span>
            </li>
          </ul>
        </div>
        <base-btn :class="$style.btn" @click="handleSubmit">{{ $t('songlist__import_input_btn_confirm') }}</base-btn>
      </div>
    </main>
  </material-modal>
</template>

<script setup>
import { openSongListInputInfo } from '@renderer/store/songList/state'
import { setOpenSongListInputInfo } from '@renderer/store/songList/action'
import { ref, watch } from '@common/utils/vueTools'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { openUrl } from '@common/utils/electron'

const props = defineProps({
  modelValue: Boolean,
  sourceList: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['update:model-value'])

const router = useRouter()
const route = useRoute()
const text = ref('')
const source = ref('')
const normalizeQueryValue = (value) => Array.isArray(value) ? value[0] : value
const getInitialSource = () => {
  return [
    openSongListInputInfo.source,
    normalizeQueryValue(route.query.source),
    props.sourceList[0]?.id,
  ].find(value => value != null && value !== '') ?? ''
}

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  source.value = getInitialSource()
  text.value = openSongListInputInfo.text
})

const handleSubmit = () => {
  const value = text.value.trim()
  if (!value.length) return
  text.value = value
  setOpenSongListInputInfo(value, source.value)
  void router.push({
    path: '/songList/detail',
    query: {
      source: source.value,
      id: value,
      refresh: 'true',
    },
  })
}

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  padding: 12px 22px 22px;
  display: flex;
  flex-flow: column nowrap;
  min-height: 0;
  gap: 18px;

  h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--ui-text-primary);
    line-height: 1.35;
    word-break: break-all;
    padding-top: 4px;
  }
}
.inputContent {
  display: flex;
  flex-flow: row nowrap;
  align-items: stretch;
  padding: 10px;
  border: 1px solid rgba(228, 228, 232, 0.98);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(246, 246, 248, 0.995));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78), 0 16px 34px rgba(15, 23, 42, 0.05);
}
.select {
  width: 150px;
  flex: none;

  :global {
    .label-content {
      min-height: 44px;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      border-right-color: transparent;
      background: transparent !important;
      box-shadow: none;
    }

    .selection-list {
      li {
        text-align: center;
        justify-content: center;
      }
    }
  }
}
.input {
  flex: auto;
  min-height: 44px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  padding: 0 16px;
  border-left-color: rgba(228, 228, 232, 0.68);
  background: transparent;
  box-shadow: none;

  &:hover,
  &:focus {
    background: rgba(255, 255, 255, 0.52);
    box-shadow: none;
  }
}
.footer {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-end;
  gap: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(232, 232, 236, 0.94);
}

.tips {
  flex: auto;
  font-size: var(--ui-font-caption);
  color: var(--ui-text-secondary);
  line-height: var(--ui-line-body);

  ul {
    list-style: decimal;
    padding-left: 18px;
  }

  li + li {
    margin-top: 6px;
  }

  span {
    color: var(--ui-text-accent);
  }
}

.btn {
  min-width: 104px;
  min-height: 40px;
  padding: 0 20px;
  font-weight: 600;
}


</style>
