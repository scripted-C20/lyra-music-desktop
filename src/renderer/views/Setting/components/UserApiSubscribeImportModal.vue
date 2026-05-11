<template lang="pug">
material-modal(:show="show" teleport="#view" @close="handleClose")
  main(:class="$style.main")
    div(:class="$style.header")
      h2 {{ $t('user_api_subscribe_import__title') }}
    base-input(
      ref="nameInput"
      v-model="subscriptionName"
      :class="$style.input"
      type="text"
      :placeholder="$t('user_api_subscribe_import__name_tip')"
      :disabled="isFetchingSubscribe"
    )
    base-input(
      ref="input"
      v-model="url"
      :class="$style.input"
      type="url"
      :placeholder="$t('user_api_subscribe_import__input_tip')"
      :disabled="isFetchingSubscribe"
      @submit="handleFetchSubscribe"
    )
    div(v-if="isFetchingSubscribe" :class="$style.loading")
      line-icon(:icon="LoaderCircle" :size="18" :class="$style.loadingIcon")
      p {{ $t('user_api_subscribe_import__input_loading') }}
    div(v-else-if="subscribeSources.length" :class="$style.preview")
      div(:class="$style.previewHeader")
        span(:class="$style.badge") {{ subscribeSources.length }}
        p {{ $t('user_api_subscribe_import__source_count', { count: subscribeSources.length }) }}
        base-btn(min @click="toggleSelectAll") {{ isAllSelected ? $t('user_api_subscribe_import__deselect_all') : $t('user_api_subscribe_import__select_all') }}
      ul.scroll(:class="$style.sourceList")
        li(v-for="(source, index) in subscribeSources" :key="index" :class="$style.sourceItem")
          base-checkbox(:id="`subscribe_source_${index}`" v-model="source.selected" :class="$style.checkbox")
          div(:class="$style.sourceInfo")
            h3 {{ source.name }}
            div(:class="$style.sourceMeta")
              span(v-if="source.version") {{ /^\d/.test(source.version) ? `v${source.version}` : source.version }}
              span(v-if="source.author") {{ source.author }}
            p(v-if="source.description") {{ source.description }}
    div(v-else-if="subscribeFetched" :class="$style.empty")
      p {{ $t('user_api_subscribe_import__empty') }}
    div(:class="$style.footer")
      base-btn(:class="[$style.btn, $style.cancelBtn]" :disabled="isFetchingSubscribe" @click="handleClose") {{ $t('btn_close') }}
      base-btn(
        v-if="subscribeSources.length"
        :class="[$style.btn, $style.primaryBtn, isImporting ? $style.btnLoading : null]"
        :disabled="isImporting || !hasSelected"
        @click="handleBatchImport"
      )
        line-icon(v-if="isImporting" :icon="LoaderCircle" :size="16" :class="$style.btnLoadingIcon")
        span {{ importBtnText }}
      base-btn(
        v-else
        :class="[$style.btn, $style.primaryBtn, isFetchingSubscribe ? $style.btnLoading : null]"
        :disabled="isFetchingSubscribe || !url"
        @click="handleFetchSubscribe"
      )
        line-icon(v-if="isFetchingSubscribe" :icon="LoaderCircle" :size="16" :class="$style.btnLoadingIcon")
        span {{ fetchBtnText }}
</template>

<script>
import { httpFetch } from '@renderer/utils/request'
import { importUserApi, setUserApi } from '@renderer/utils/ipc'
import { updateSetting } from '@renderer/store/setting'
import { dialog } from '@renderer/plugins/Dialog'
import { LoaderCircle } from 'lucide-vue-next'

export default {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:show', 'imported'],
  setup() {
    return {
      LoaderCircle,
    }
  },
  data() {
    return {
      subscriptionName: '',
      url: '',
      isFetchingSubscribe: false,
      subscribeFetched: false,
      isImporting: false,
      subscribeSources: [],
    }
  },
  computed: {
    hasSelected() {
      return this.subscribeSources.some(s => s.selected)
    },
    isAllSelected() {
      return this.subscribeSources.length > 0 && this.subscribeSources.every(s => s.selected)
    },
    importBtnText() {
      if (!this.isImporting) return this.$t('user_api_subscribe_import__import_btn')
      return this.$t('user_api_subscribe_import__importing')
    },
    fetchBtnText() {
      if (!this.isFetchingSubscribe) return this.$t('user_api_subscribe_import__input_confirm')
      return this.$t('user_api_subscribe_import__input_loading')
    },
  },
  watch: {
    show(n) {
      if (n) {
        this.resetState()
        this.$nextTick(() => this.$refs.nameInput?.focus())
      }
    },
  },
  methods: {
    resetState() {
      this.subscriptionName = ''
      this.url = ''
      this.isFetchingSubscribe = false
      this.subscribeFetched = false
      this.isImporting = false
      this.subscribeSources = []
    },
    handleClose() {
      this.resetState()
      this.$emit('update:show', false)
    },
    verifyUrl() {
      this.url = this.url.trim()
      if (!/^https?:\/\//.test(this.url)) this.url = ''
      return this.url
    },
    verifyName() {
      this.subscriptionName = this.subscriptionName.trim()
      return this.subscriptionName
    },
    parseSubscribePayload(body) {
      if (Array.isArray(body)) return body
      if (typeof body === 'string') {
        let data
        try {
          data = JSON.parse(body)
        } catch {
          throw new Error(this.$t('user_api_subscribe_import__invalid_json'))
        }
        if (Array.isArray(data)) return data
      }
      throw new Error(this.$t('user_api_subscribe_import__invalid_format'))
    },
    normalizeSubscribeSources(body) {
      return this.parseSubscribePayload(body)
        .filter(item => item?.name && item?.url)
        .map(item => ({
          name: item.name,
          description: item.description || '',
          author: item.author || '',
          version: item.version || '',
          homepage: item.homepage || '',
          script: item.url,
          selected: false,
        }))
    },
    async handleFetchSubscribe() {
      const subscriptionName = this.verifyName()
      const url = this.verifyUrl()
      if (!subscriptionName) {
        void dialog(this.$t('user_api_subscribe_import__name_required'))
        return
      }
      if (!url) return
      this.isFetchingSubscribe = true
      this.subscribeFetched = false
      this.subscribeSources = []
      try {
        const resp = await httpFetch(url, { follow_max: 3 }).promise
        this.subscribeSources = this.normalizeSubscribeSources(resp.body)
        this.subscribeFetched = true
      } catch (err) {
        void dialog(this.$t('user_api_subscribe_import__failed', { message: err.message }))
      } finally {
        this.isFetchingSubscribe = false
      }
    },
    toggleSelectAll() {
      const newVal = !this.isAllSelected
      this.subscribeSources.forEach(s => { s.selected = newVal })
    },
    async handleBatchImport() {
      const selectedSources = this.subscribeSources.filter(s => s.selected)
      if (!selectedSources.length) return
      const subscriptionName = this.verifyName()
      if (!subscriptionName) {
        void dialog(this.$t('user_api_subscribe_import__name_required'))
        return
      }
      this.isImporting = true
      let successCount = 0
      let failCount = 0
      let firstImportedId = null
      for (const source of selectedSources) {
        try {
          let script
          if (/^https?:\/\//.test(source.script)) {
            const resp = await httpFetch(source.script, { follow_max: 3 }).promise
            script = resp.body
          } else {
            script = source.script
          }
          if (typeof script !== 'string' || script.length > 9_000_000) {
            failCount++
            continue
          }
          const result = await importUserApi({
            script,
            origin: {
              type: 'subscribe',
              subscribeName: subscriptionName,
              subscribeUrl: this.url,
            },
          })
          if (!firstImportedId && result.apiInfo) {
            firstImportedId = result.apiInfo.id
          }
          successCount++
        } catch (err) {
          failCount++
        }
      }
      if (firstImportedId) {
        await setUserApi(firstImportedId)
        updateSetting({ 'common.apiSource': firstImportedId })
      }
      void dialog(this.$t('user_api_subscribe_import__import_result', { success: successCount, fail: failCount }))
      this.$emit('imported', {
        subscribeName: subscriptionName,
        subscribeUrl: this.url,
      })
      if (successCount > 0) {
        this.handleClose()
      }
      this.isImporting = false
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  padding: 0;
  width: 500px;
  min-width: 300px;
  display: flex;
  flex-flow: column nowrap;
  min-height: 0;
  max-height: 100%;
  background: var(--color-primary-background);
  border-radius: 12px;
  overflow: hidden;
}

.header {
  padding: 20px 20px 12px;
  border-bottom: 1px solid var(--color-border);
  h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-font);
    line-height: 1.3;
    text-align: center;
  }
}

.input {
  margin: 14px 16px 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.loading {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: var(--color-font-label);
}

.loadingIcon,
.btnLoadingIcon {
  animation: subscribeSpin 1s linear infinite;
}

.preview {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  padding: 0 16px;
}

.previewHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0 6px;
  p {
    flex: auto;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-font);
  }
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

.sourceList {
  flex: auto;
  min-height: 60px;
  max-height: 260px;
  margin-top: 4px;
}

.sourceItem {
  display: flex;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 10px;
  transition: background-color 0.15s ease;
  background: var(--color-primary-background-hover);
  margin-bottom: 4px;
  &:hover {
    background: var(--color-primary-background-active);
  }
}

.checkbox {
  flex: none;
  margin-top: 3px;
  margin-right: 10px;
}

.sourceInfo {
  flex: auto;
  min-width: 0;
  h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-font);
    word-break: break-all;
  }
}

.sourceMeta {
  display: flex;
  gap: 6px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--color-font-label);
  span {
    background: var(--color-primary-background-active);
    padding: 1px 5px;
    border-radius: 3px;
  }
}

.sourceInfo p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-font-label);
  word-break: break-all;
  opacity: 0.8;
}

.empty {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: var(--color-font-label);
}

.footer {
  padding: 14px 16px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  min-width: 80px;
  height: 36px;
  line-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px !important;
  font-size: 13px;
  border-radius: 8px;
}

.btnLoading {
  box-shadow: 0 10px 22px var(--color-primary-alpha-700);
}

.primaryBtn {
  background: var(--color-primary);
  color: #fff;
  border: none;
  &:hover:not(:disabled) {
    background: var(--color-primary-dark-100);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.cancelBtn {
  color: var(--color-font);
  background: var(--color-primary-background-hover);
  border: 1px solid var(--color-border);
}

@keyframes subscribeSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
