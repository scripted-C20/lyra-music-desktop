<template lang="pug">
  material-modal(:show="modelValue" :bg-close="false" :close-btn="false" teleport="#view" width="min(704px, calc(100vw - 64px))" max-width="704px" max-height="82%" @close="handleClose")
    main(:class="$style.main")
      div(:class="$style.header")
        div(:class="$style.titleMark") API
        div(:class="$style.titleText")
          h2 {{ $t('user_api__title') }}
          span(v-if="apiList.length" :class="$style.count") {{ apiList.length }}
        div(:class="$style.headerActions")
          base-btn(
            min
            :class="$style.headerBtn"
            :disabled="isBatchTestButtonDisabled()"
            @click="handleTestAllLatency"
          ) {{ getBatchTestButtonText() }}
          base-btn(
            min
            :class="[$style.headerBtn, $style.headerBtnSecondary]"
            :disabled="isBatchFullTestButtonDisabled()"
            @click="handleTestAllFullLatency"
          ) {{ getBatchFullTestButtonText() }}
          button(type="button" :class="$style.headerCloseBtn" :aria-label="$t('close')" @click="handleClose")
            line-icon(:icon="X" :size="18" :stroke-width="2.2")
      div(v-if="apiList.length" :class="$style.toolbar")
        div(v-if="showCategoryTabs" :class="$style.toolbarRow")
          div(:class="$style.toolbarRowTrack")
            div(:class="$style.categoryGroup")
              base-btn(
                v-for="category in categoryList"
                :key="category.key"
                min
                :class="[$style.toolbarBtn, {[$style.toolbarBtn_active]: categoryKey === category.key}]"
                :title="getCategoryButtonText(category)"
                @click="handleSelectCategory(category.key)"
              ) {{ getCategoryButtonText(category) }}
        div(:class="[$style.toolbarRow, $style.toolbarRowSecondary]")
          div(:class="$style.toolbarRowTrack")
            div(:class="$style.filterGroup")
              base-btn(min :class="[$style.toolbarBtn, {[$style.toolbarBtn_active]: resultFilter === 'all'}]" @click="resultFilter = 'all'") {{ $t('user_api__filter_all') }}
              base-btn(min :class="[$style.toolbarBtn, {[$style.toolbarBtn_active]: resultFilter === 'success'}]" @click="resultFilter = 'success'") {{ $t('user_api__filter_success') }}
              base-btn(min :class="[$style.toolbarBtn, {[$style.toolbarBtn_active]: resultFilter === 'error'}]" @click="resultFilter = 'error'") {{ $t('user_api__filter_failed') }}
              base-btn(min :class="[$style.toolbarBtn, {[$style.toolbarBtn_active]: resultFilter === 'untested'}]" @click="resultFilter = 'untested'") {{ $t('user_api__filter_untested') }}
              base-btn(min :class="[$style.toolbarBtn, {[$style.toolbarBtn_active]: resultFilter === 'selected'}]" @click="resultFilter = 'selected'") {{ $t('user_api__filter_selected') }}
            div(:class="$style.selectGroup")
              base-btn(min :class="$style.toolbarBtn" :disabled="isBusy || !displayApiList.length" @click="selectDisplayedApis") {{ $t('user_api__btn_select_filtered') }}
              base-btn(min :class="$style.toolbarBtn" :disabled="isBusy || !selectedCount" @click="clearSelectedApis") {{ $t('user_api__btn_clear_selected') }}
              span(:class="$style.selectedCount") {{ $t('user_api__selected_count', { count: selectedCount }) }}
            base-btn(
              min
              :class="[$style.toolbarBtn, $style.toolbarActionBtn, isResubscribing ? $style.toolbarBtnLoading : null]"
              :disabled="isBusy || !activeSubscribeCategory?.subscribeUrl"
              @click="handleResubscribe"
            )
              line-icon(:icon="isResubscribing ? LoaderCircle : RefreshCw" :size="14" :class="isResubscribing ? $style.spinningIcon : null")
              span {{ getResubscribeButtonText() }}
      ul.scroll(v-if="displayApiList.length" :class="$style.content")
        li(v-for="api in displayApiList" :key="api.id" :class="[$style.listItem, {[$style.active]: appSetting['common.apiSource'] == api.id}]" @click="handleSelectSource(api)")
          span(:class="$style.activeDot" aria-hidden="true")
          div(:class="$style.cardLeft")
            div(:class="$style.cardHeader")
              h3 {{ api.name }}
              span(:class="[$style.categoryTag, {[$style.categoryTag_subscribe]: getApiOrigin(api).type === 'subscribe'}]" :title="getApiCategoryLabel(api)") {{ getApiCategoryLabel(api) }}
              span(v-if="api.version" :class="$style.version") {{ /^\d/.test(api.version) ? `v${api.version}` : api.version }}
            div(:class="$style.cardMeta")
              span(v-if="api.author" :class="$style.author") {{ api.author }}
              span(v-if="api.description" :class="$style.desc") {{ api.description }}
            div(v-if="getApiSourceList(api).length" :class="$style.sourceRow")
              span(v-for="source in getApiSourceList(api)" :key="source" :class="$style.sourceTag") {{ getSourceDisplayName(source) }}
            div(:class="$style.checkboxRow" @click.stop)
              base-checkbox(:id="`user_api_${api.id}`" :model-value="api.allowShowUpdateAlert === true" :class="$style.checkbox" :label="$t('user_api__allow_show_update_alert')" @update:model-value="handleChangeAllowUpdateAlert(api, $event)")
            div(:class="$style.testRow" @click.stop)
              base-btn(
                min
                :class="$style.testBtn"
                :disabled="isTestButtonDisabled(api.id)"
                @click.stop="handleTestLatency(api)"
              ) {{ getTestButtonText(api.id) }}
              base-btn(
                min
                :class="[$style.testBtn, $style.testBtnSecondary]"
                :disabled="isFullTestButtonDisabled(api.id)"
                @click.stop="handleTestFullLatency(api)"
              ) {{ getFullTestButtonText(api.id) }}
              span(v-if="getDisplayTestState(api.id)" :class="[$style.testStatus, $style[`testStatus_${getDisplayTestState(api.id).status}`]]") {{ getTestSummary(api.id) }}
            p(v-if="getTestDetail(api.id)" :class="$style.testDetail") {{ getTestDetail(api.id) }}
          div(:class="$style.cardRight")
            base-btn(min :class="[$style.selectBtn, {[$style.selectBtn_active]: isApiSelected(api.id)}]" :disabled="isBusy" @click.stop="toggleApiSelected(api.id)")
              | {{ isApiSelected(api.id) ? $t('user_api__btn_selected') : $t('user_api__btn_select') }}
            base-btn(:class="$style.removeBtn" outline :disabled="isRemoveButtonDisabled()" :aria-label="$t('user_api__btn_remove')" @click.stop="handleRemove(api)")
              app-icon(name="delete" :size="16")
      div(v-else :class="$style.content")
        div(:class="$style.noitem")
          span(:class="$style.noitemIcon") API
          span {{ getEmptyText() }}
      div(:class="$style.note")
        div(:class="$style.noteTrack")
          div(:class="$style.docItem")
            button(type="button" :class="$style.docLink" @click="handleOpenUrl(USER_API_README_URL)")
              span {{ $t('user_api__doc_readme') }}
              line-icon(:icon="ExternalLink" :size="14")
          div(:class="$style.docItem")
            button(type="button" :class="$style.docLink" @click="handleOpenUrl(USER_API_FAQ_URL)")
              span {{ $t('user_api__doc_faq') }}
              line-icon(:icon="ExternalLink" :size="14")
          button(type="button" :class="$style.noteInfoBtn" :aria-label="$t('user_api__doc_test_latency')" :title="$t('user_api__test_latency_note')" @click="handleShowTip('user_api__test_latency_note')")
            span {{ $t('user_api__doc_test_latency') }}
            line-icon(:icon="CircleHelp" :size="14" :stroke-width="2.2")
      div(:class="$style.footer")
        base-btn(:class="[$style.footerBtn, $style.primaryBtn]" :disabled="isBusy" @click="isShowOnlineImportModal = true") {{ $t('user_api__btn_import_online') }}
        base-btn(:class="$style.footerBtn" :disabled="isBusy" @click="handleImport") {{ $t('user_api__btn_import') }}
        base-btn(:class="$style.footerBtn" :disabled="isBusy || !selectedCount" @click="handleExport") {{ $t('user_api__btn_export_selected') }}
        base-btn(:class="$style.footerBtn" :disabled="isBusy" @click="isShowSubscribeImportModal = true") {{ $t('user_api__btn_import_subscribe') }}
        base-btn(v-if="apiList.length" :class="[$style.footerBtn, $style.dangerBtn]" :disabled="isRemoveButtonDisabled()" @click="handleRemoveAction") {{ getRemoveActionText() }}
      UserApiOnlineImportModal(v-model:show="isShowOnlineImportModal" @import="importUserApi")
      UserApiSubscribeImportModal(v-model:show="isShowSubscribeImportModal" @imported="handleSubscribeImported")
</template>

<script>
import { exportUserApi, importUserApi as importUserApiAction, openSaveDir, removeUserApi, showSelectDialog, setAllowShowUserApiUpdateAlert, getUserApiList, testUserApiLatency, cancelUserApiLatencyTest } from '@renderer/utils/ipc'
import { gzipData, readFile, saveStrToFile } from '@common/utils/nodejs'
import { openUrl } from '@common/utils/electron'
import { sourceNames, userApi } from '@renderer/store'
import { appSetting, mergeSetting, updateSetting } from '@renderer/store/setting'
import { computed, ref } from '@common/utils/vueTools'
import { dialog } from '@renderer/plugins/Dialog'
import musicSdk from '@renderer/utils/musicSdk'
import { builtinOnlineSourceIds, getBuiltinFallbackSourceId } from '@renderer/utils/musicSdk/source-fallback'
import { toNewMusicInfo } from '@renderer/utils'
import { createPlaybackVerifyTask } from '@renderer/core/music/utils'
import { requestMsg } from '@renderer/utils/message'
import { httpFetch } from '@renderer/utils/request'
import { CircleHelp, ExternalLink, LoaderCircle, RefreshCw, X } from 'lucide-vue-next'

import UserApiOnlineImportModal from './UserApiOnlineImportModal.vue'
import UserApiSubscribeImportModal from './UserApiSubscribeImportModal.vue'

const TEST_SOURCE_ORDER = builtinOnlineSourceIds
const TEST_SEARCH_KEYWORDS = [
  '稻香 周杰伦',
  '晴天 周杰伦',
  '夜曲 周杰伦',
  '七里香 周杰伦',
  '青花瓷 周杰伦',
  '起风了 买辣椒也用券',
  '后来 刘若英',
  '演员 薛之谦',
  '孤勇者 陈奕迅',
  '光年之外 邓紫棋',
  '泡沫 邓紫棋',
  '红豆 王菲',
  '烟花易冷 周杰伦',
  '兰亭序 周杰伦',
  '告白气球 周杰伦',
  '一路向北 周杰伦',
  '搁浅 周杰伦',
  '半岛铁盒 周杰伦',
  '明明就 周杰伦',
  '倒带 蔡依林',
  '青藏高原 韩红',
  '后来 后来 刘若英',
  '成全 刘若英',
  '如愿 王菲',
  '匆匆那年 王菲',
  '小幸运 田馥甄',
  '追光者 岑宁儿',
]
const TEST_SEARCH_RESULT_LIMIT = 20
const MAX_TEST_SAMPLES_PER_SOURCE = 8
const BATCH_TEST_CONCURRENCY = 5
const BATCH_FULL_TEST_CONCURRENCY = 5
const USER_API_README_URL = 'https://lyswhut.github.io/lx-music-doc/desktop/custom-source'
const USER_API_FAQ_URL = 'https://lyswhut.github.io/lx-music-doc/desktop/faq'
const getSubscribeOriginFallbackName = (subscribeUrl) => {
  if (!subscribeUrl) return ''
  try {
    const hostname = new URL(subscribeUrl).hostname.replace(/^www\./, '')
    return hostname || ''
  } catch {
    return ''
  }
}

const selectTestMusics = result => {
  const list = result?.list
  if (!Array.isArray(list)) return []
  return list
    .filter(item => item?.name && item?._types && Object.keys(item._types).length)
    .map(item => toNewMusicInfo(item))
}
const getLatencyTestSampleKey = musicInfo => `${musicInfo.source}_${musicInfo.id}`
const cloneLatencyTestMusicInfo = musicInfo => {
  if (!musicInfo) return musicInfo
  if (typeof structuredClone == 'function') return structuredClone(musicInfo)
  return JSON.parse(JSON.stringify(musicInfo))
}
const cloneLatencyTestSamples = samples => Object.fromEntries(Object.entries(samples ?? {}).map(([source, value]) => {
  const list = (Array.isArray(value) ? value : value ? [value] : []).map(cloneLatencyTestMusicInfo)
  return [source, list]
}).filter(([, list]) => list.length))
const hasLatencyTestSamples = samples => Object.values(samples ?? {}).some(value => Array.isArray(value) ? value.length : !!value)
const getLatencyTestSourceSamples = (samples, source) => {
  const sampleValue = samples?.[source]
  const list = (Array.isArray(sampleValue) ? sampleValue : sampleValue ? [sampleValue] : []).map(cloneLatencyTestMusicInfo)
  return list.length ? { [source]: list } : {}
}
const removeLatencyTestSample = (samples, source, musicInfo) => {
  const nextSamples = cloneLatencyTestSamples(samples)
  const sampleList = nextSamples[source]
  if (!Array.isArray(sampleList) || !musicInfo) return nextSamples
  const sampleKey = getLatencyTestSampleKey(musicInfo)
  const nextList = sampleList.filter(item => getLatencyTestSampleKey(item) !== sampleKey)
  nextSamples[source] = nextList
  return nextSamples
}
const normalizeExportFileName = name => name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'user_api'
const formatSeconds = ms => {
  const seconds = Math.max(0, ms) / 1000
  const fixed = seconds >= 10 ? seconds.toFixed(1) : seconds.toFixed(2)
  return fixed.replace(/\.0$/, '').replace(/(\.\d*[1-9])0$/, '$1')
}
const STOPPING_LATENCY_TEST_MESSAGE = '停止中...'
const STOP_LATENCY_TEST_BUTTON_TEXT = '停止测试'
const LATENCY_TEST_CANCEL_MESSAGE = 'Cancel request'
const BATCH_SAMPLE_PREPARE_KEY = '__batch__'
const createLatencyTestCancelError = () => new Error(LATENCY_TEST_CANCEL_MESSAGE)
const createStrictVerifyPlayableUrlTask = url => createPlaybackVerifyTask(url, {
  failedMessage: 'play verify failed',
  timeoutMessage: 'play verify timeout',
  cancelMessage: LATENCY_TEST_CANCEL_MESSAGE,
})

export default {
  components: {
    UserApiOnlineImportModal,
    UserApiSubscribeImportModal,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup() {
    const isShowOnlineImportModal = ref(false)
    const isShowSubscribeImportModal = ref(false)
    const apiList = computed(() => userApi.list)

    return {
      userApi,
      apiList,
      sourceNames,
      appSetting,
      isShowOnlineImportModal,
      isShowSubscribeImportModal,
      USER_API_README_URL,
      USER_API_FAQ_URL,
      CircleHelp,
      ExternalLink,
      LoaderCircle,
      RefreshCw,
      X,
    }
  },
  data() {
    return {
      testStates: {},
      activeTestApiIds: [],
      preparingTestApiIds: [],
      pendingStopTestApiIds: [],
      isPreparingSamples: false,
      isBatchTesting: false,
      batchTestMode: '',
      isBatchStopRequested: false,
      isExporting: false,
      isResubscribing: false,
      resultFilter: 'all',
      categoryKey: 'local',
      selectedApiIds: [],
      removedDuringBatchApiIds: [],
      queuedBatchTestApiIds: [],
      batchTestProgress: {
        current: 0,
        total: 0,
      },
      latencyTestSamples: null,
      latencyTestSamplesPromise: null,
      samplePrepareWaiters: {},
      verifyTasks: {},
    }
  },
  computed: {
    isBusy() {
      return this.isPreparingSamples ||
        this.isBatchTesting ||
        !!this.activeTestApiIds.length ||
        !!this.preparingTestApiIds.length ||
        !!this.pendingStopTestApiIds.length ||
        this.isExporting ||
        this.isResubscribing
    },
    selectedCount() {
      return this.apiList.filter(api => this.selectedApiIds.includes(api.id)).length
    },
    categoryList() {
      const categories = [{
        key: 'local',
        label: this.$t('user_api__category_local'),
        count: 0,
        type: 'local',
      }]
      const subscribeMap = new Map()
      for (const api of this.apiList) {
        const origin = this.getApiOrigin(api)
        if (origin.type !== 'subscribe') {
          categories[0].count++
          continue
        }
        const key = this.getSubscribeCategoryKey(origin)
        if (!subscribeMap.has(key)) {
          const subscribeName = this.getSubscribeOriginName(origin)
          subscribeMap.set(key, {
            key,
            label: subscribeName,
            count: 0,
            type: 'subscribe',
            subscribeName,
            subscribeUrl: origin.subscribeUrl,
          })
        }
        subscribeMap.get(key).count++
      }
      return categories.concat(Array.from(subscribeMap.values()))
    },
    activeSubscribeCategory() {
      const category = this.categoryList.find(item => item.key === this.categoryKey)
      return category?.type === 'subscribe' ? category : null
    },
    showCategoryTabs() {
      return this.categoryList.length > 0
    },
    displayApiList() {
      return this.apiList.filter(api => this.matchCategoryFilter(api) && this.matchResultFilter(api))
    },
  },
  watch: {
    apiList() {
      if (!this.categoryList.some(category => category.key === this.categoryKey)) this.categoryKey = 'local'
    },
    modelValue(value) {
      if (value) return
      this.cleanupBeforeClose()
    },
  },
  beforeUnmount() {
    this.cleanupBeforeClose()
  },
  methods: {
    async importUserApi(script) {
      return importUserApiAction(script).then(({ apiList }) => {
        userApi.list = apiList
      }).catch((err) => {
        void dialog(this.$t('user_api_import__failed', { message: err.message }))
      })
    },
    handleImport() {
      if (this.userApi.list.length > 20) {
        this.$dialog({
          message: this.$t('user_api__max_tip'),
          confirmButtonText: this.$t('ok'),
        })
        return
      }
      void showSelectDialog({
        title: this.$t('user_api__import_file'),
        properties: ['openFile'],
        filters: [
          { name: 'LX API File', extensions: ['js'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      }).then(async result => {
        if (result.canceled) return
        return readFile(result.filePaths[0]).then(async data => {
          return this.importUserApi(data.toString())
        })
      })
    },
    async handleExport() {
      if (!this.selectedCount) return
      this.isExporting = true
      try {
        const exportItems = await exportUserApi(this.selectedApiIds)
        if (!exportItems.length) throw new Error(this.$t('user_api__export_empty'))
        const isSingle = exportItems.length === 1
        const fileName = isSingle
          ? `${normalizeExportFileName(exportItems[0].name)}.js.gz`
          : `lx-music-user-api_${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}.json.gz`
        const result = await openSaveDir({
          title: this.$t('user_api__btn_export_selected'),
          defaultPath: fileName,
          filters: [
            { name: 'Gzip Files', extensions: ['gz'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        })
        if (result.canceled || !result.filePath) return
        const output = isSingle
          ? await gzipData(exportItems[0].script)
          : await gzipData(JSON.stringify({
            type: 'lx_music_user_api_bundle',
            version: 1,
            exportedAt: new Date().toISOString(),
            apis: exportItems,
          }, null, 2))
        await saveStrToFile(result.filePath, output)
        await dialog(this.$t('user_api__export_done', { count: exportItems.length }))
      } catch (err) {
        void dialog(err instanceof Error ? err.message : String(err))
      } finally {
        this.isExporting = false
      }
    },
    removeTestState(apiId) {
      const { [apiId]: _removedState, ...nextStates } = this.testStates
      this.testStates = nextStates
    },
    isLatencyTestCancelError(error) {
      return (error instanceof Error ? error.message : String(error)) === LATENCY_TEST_CANCEL_MESSAGE
    },
    isSamplePrepareStopRequested(waiterKey) {
      if (!waiterKey) return false
      if (waiterKey === BATCH_SAMPLE_PREPARE_KEY) return this.isBatchStopRequested
      return this.isPendingStopTestApi(waiterKey) || !this.apiList.some(api => api.id === waiterKey)
    },
    throwIfLatencyTestStopped(apiId) {
      if (this.isPendingStopTestApi(apiId)) throw createLatencyTestCancelError()
      if (!this.apiList.some(api => api.id === apiId)) throw createLatencyTestCancelError()
    },
    setSamplePrepareWaiter(waiterKey, reject) {
      this.samplePrepareWaiters = {
        ...this.samplePrepareWaiters,
        [waiterKey]: reject,
      }
    },
    clearSamplePrepareWaiter(waiterKey, reject = null) {
      if (reject && this.samplePrepareWaiters[waiterKey] !== reject) return
      if (!this.samplePrepareWaiters[waiterKey]) return
      const { [waiterKey]: _removedWaiter, ...nextWaiters } = this.samplePrepareWaiters
      this.samplePrepareWaiters = nextWaiters
    },
    cancelSamplePrepareWaiter(waiterKey) {
      const reject = this.samplePrepareWaiters[waiterKey]
      if (!reject) return
      this.clearSamplePrepareWaiter(waiterKey, reject)
      reject(createLatencyTestCancelError())
    },
    cancelAllSamplePrepareWaiters() {
      const waiters = Object.values(this.samplePrepareWaiters)
      this.samplePrepareWaiters = {}
      for (const reject of waiters) reject?.(createLatencyTestCancelError())
    },
    invalidateLatencyTestSamples() {
      this.latencyTestSamples = null
      this.latencyTestSamplesPromise = null
    },
    async waitForLatencyTestSamples(waiterKey = '', options = {}) {
      if (!waiterKey) return this.getLatencyTestSamples(options)
      this.clearSamplePrepareWaiter(waiterKey)
      let rejectWaiter = () => {}
      const cancelPromise = new Promise((_resolve, reject) => {
        rejectWaiter = reject
      })
      this.setSamplePrepareWaiter(waiterKey, rejectWaiter)
      if (this.isSamplePrepareStopRequested(waiterKey)) this.cancelSamplePrepareWaiter(waiterKey)
      return await Promise.race([
        this.getLatencyTestSamples(options),
        cancelPromise,
      ]).finally(() => {
        this.clearSamplePrepareWaiter(waiterKey, rejectWaiter)
      })
    },
    setVerifyTask(apiId, task) {
      this.verifyTasks = {
        ...this.verifyTasks,
        [apiId]: task,
      }
    },
    clearVerifyTask(apiId, task = null) {
      if (task && this.verifyTasks[apiId] !== task) return
      if (!this.verifyTasks[apiId]) return
      const { [apiId]: _removedTask, ...nextTasks } = this.verifyTasks
      this.verifyTasks = nextTasks
    },
    cancelVerifyTask(apiId) {
      const task = this.verifyTasks[apiId]
      if (!task) return
      this.clearVerifyTask(apiId, task)
      task.cancel()
    },
    cancelAllVerifyTasks() {
      const tasks = Object.values(this.verifyTasks)
      this.verifyTasks = {}
      for (const task of tasks) task?.cancel?.()
    },
    toggleApiSelected(apiId) {
      this.selectedApiIds = this.isApiSelected(apiId)
        ? this.selectedApiIds.filter(id => id !== apiId)
        : [...this.selectedApiIds, apiId]
    },
    clearSelectedApis() {
      this.selectedApiIds = []
    },
    selectDisplayedApis() {
      const ids = this.displayApiList.map(api => api.id)
      this.selectedApiIds = Array.from(new Set([...this.selectedApiIds, ...ids]))
    },
    getSelectedApiIds() {
      const currentIds = new Set(this.apiList.map(api => api.id))
      return this.selectedApiIds.filter(id => currentIds.has(id))
    },
    getRemoveActionIds() {
      const selectedIds = this.getSelectedApiIds()
      return selectedIds.length ? selectedIds : this.apiList.map(api => api.id)
    },
    getRemoveActionText() {
      return this.getSelectedApiIds().length
        ? this.$t('user_api__btn_remove_selected')
        : this.$t('user_api__btn_remove_all')
    },
    getApiOrigin(api) {
      if (api?.origin?.type === 'subscribe' && (api.origin.subscribeName || api.origin.subscribeUrl)) return api.origin
      return { type: 'local' }
    },
    getSubscribeOriginName(origin) {
      return origin?.subscribeName?.trim() || getSubscribeOriginFallbackName(origin?.subscribeUrl) || this.$t('user_api__category_subscribe')
    },
    getSubscribeCategoryKey(target) {
      const origin = target?.origin ? this.getApiOrigin(target) : target
      if (origin?.type === 'subscribe') {
        if (origin.subscribeUrl) return `subscribe:${origin.subscribeUrl}`
        return `subscribe_name:${this.getSubscribeOriginName(origin)}`
      }
      return 'local'
    },
    getCategoryButtonText(category) {
      return `${category.label} (${category.count})`
    },
    handleSelectCategory(categoryKey) {
      this.categoryKey = categoryKey
    },
    matchCategoryFilter(api, categoryKey = this.categoryKey) {
      if (categoryKey === 'local') return this.getApiOrigin(api).type !== 'subscribe'
      return this.getSubscribeCategoryKey(api) === categoryKey
    },
    getApiCategoryLabel(api) {
      const origin = this.getApiOrigin(api)
      return origin.type === 'subscribe' ? this.getSubscribeOriginName(origin) : this.$t('user_api__category_local')
    },
    async switchSource(sourceId) {
      if (!sourceId || appSetting['common.apiSource'] === sourceId) return
      mergeSetting({ 'common.apiSource': sourceId })
      updateSetting({ 'common.apiSource': sourceId })
    },
    getFallbackSourceId(excludeIds = []) {
      const builtinId = getBuiltinFallbackSourceId(excludeIds)
      if (builtinId && !excludeIds.includes(builtinId)) return builtinId
      return this.apiList.find(api => !excludeIds.includes(api.id))?.id ?? ''
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
          script: item.url,
        }))
    },
    async fetchSubscribeSources(subscribeUrl) {
      const resp = await httpFetch(subscribeUrl, { follow_max: 3 }).promise
      return this.normalizeSubscribeSources(resp.body)
    },
    async fetchSubscribeScript(script) {
      if (!/^https?:\/\//.test(script)) return script
      const resp = await httpFetch(script, { follow_max: 3 }).promise
      return resp.body
    },
    async handleShowTip(messageKey) {
      await dialog(this.$t(messageKey))
    },
    async handleRemove(api) {
      if (!api) return
      if (this.isBatchTesting) this.markRemovedDuringBatchApi(api.id)
      if (this.isApiTesting(api.id)) this.stopLatencyTest(api.id)
      try {
        if (appSetting['common.apiSource'] == api.id) {
          const fallbackId = this.getFallbackSourceId([api.id])
          if (fallbackId) await this.switchSource(fallbackId)
        }
        this.removeTestState(api.id)
        this.selectedApiIds = this.selectedApiIds.filter(id => id !== api.id)
        userApi.list = await removeUserApi([api.id])
      } catch (err) {
        await dialog(err instanceof Error ? err.message : String(err))
      }
    },
    async handleRemoveAction() {
      const ids = this.getRemoveActionIds()
      const count = ids.length
      if (!count) return
      const isRemoveSelected = count !== this.apiList.length
      void dialog({
        message: this.$t(isRemoveSelected ? 'user_api__remove_selected_confirm' : 'user_api__remove_all_confirm', { count }),
        confirmButtonText: this.$t('btn_confirm'),
        cancelButtonText: this.$t('btn_cancel'),
        showCancel: true,
      }).then(async confirmed => {
        if (!confirmed) return
        if (this.isBatchTesting) {
          ids.forEach(id => {
            this.markRemovedDuringBatchApi(id)
          })
        }
        ids.forEach(id => {
          if (this.isApiTesting(id)) this.stopLatencyTest(id)
        })
        if (ids.some(id => id === appSetting['common.apiSource'])) {
          const fallbackId = this.getFallbackSourceId(ids)
          if (fallbackId) await this.switchSource(fallbackId)
        }
        for (const id of ids) this.removeTestState(id)
        this.selectedApiIds = this.selectedApiIds.filter(id => !ids.includes(id))
        try {
          userApi.list = await removeUserApi(ids)
        } catch (err) {
          await dialog(err instanceof Error ? err.message : String(err))
        }
      }).catch(() => {})
    },
    async handleSelectSource(api) {
      if (this.isBusy) return
      if (appSetting['common.apiSource'] === api.id) return
      await this.switchSource(api.id)
    },
    async handleSubscribeImported(payload) {
      userApi.list = await getUserApiList()
      if (payload?.subscribeUrl) this.categoryKey = `subscribe:${payload.subscribeUrl}`
    },
    async handleResubscribe() {
      const activeCategory = this.activeSubscribeCategory
      if (!activeCategory || this.isBusy) return
      const confirmed = await dialog.confirm({
        message: this.$t('user_api__resubscribe_confirm', { name: activeCategory.label }),
        confirmButtonText: this.$t('btn_confirm'),
        cancelButtonText: this.$t('btn_cancel'),
      })
      if (!confirmed) return
      this.isResubscribing = true
      try {
        const subscribeSources = await this.fetchSubscribeSources(activeCategory.subscribeUrl)
        if (!subscribeSources.length) throw new Error(this.$t('user_api_subscribe_import__empty'))
        const nextImportList = []
        let failCount = 0
        for (const source of subscribeSources) {
          try {
            const script = await this.fetchSubscribeScript(source.script)
            if (typeof script !== 'string' || script.length > 9_000_000) {
              failCount++
              continue
            }
            nextImportList.push({
              script,
              origin: {
                type: 'subscribe',
                subscribeName: activeCategory.subscribeName,
                subscribeUrl: activeCategory.subscribeUrl,
              },
            })
          } catch {
            failCount++
          }
        }
        if (!nextImportList.length) {
          await dialog(this.$t('user_api__resubscribe_result', { success: 0, fail: subscribeSources.length }))
          return
        }
        const currentCategoryKey = activeCategory.key
        const currentCategoryApiIds = this.apiList
          .filter(api => this.getSubscribeCategoryKey(api) === currentCategoryKey)
          .map(api => api.id)
        const shouldRestoreCurrent = currentCategoryApiIds.includes(appSetting['common.apiSource'])
        if (shouldRestoreCurrent) {
          const fallbackId = this.getFallbackSourceId(currentCategoryApiIds)
          if (fallbackId) await this.switchSource(fallbackId)
        }
        this.testStates = Object.fromEntries(Object.entries(this.testStates).filter(([id]) => !currentCategoryApiIds.includes(id)))
        this.selectedApiIds = this.selectedApiIds.filter(id => !currentCategoryApiIds.includes(id))
        userApi.list = await removeUserApi(currentCategoryApiIds)

        let successCount = 0
        let firstImportedId = ''
        for (const params of nextImportList) {
          try {
            const result = await importUserApiAction(params)
            if (!firstImportedId && result.apiInfo?.id) firstImportedId = result.apiInfo.id
            successCount++
          } catch {
            failCount++
          }
        }
        userApi.list = await getUserApiList()
        this.categoryKey = currentCategoryKey
        if (shouldRestoreCurrent && firstImportedId) await this.switchSource(firstImportedId)
        await dialog(this.$t('user_api__resubscribe_result', { success: successCount, fail: failCount }))
      } catch (err) {
        void dialog(err instanceof Error ? err.message : String(err))
      } finally {
        this.isResubscribing = false
      }
    },
    handleClose() {
      this.cleanupBeforeClose()
      this.$emit('update:modelValue', false)
    },
    cleanupBeforeClose() {
      this.stopAllLatencyTests()
      this.cancelAllSamplePrepareWaiters()
      this.cancelAllVerifyTasks()
      this.clearQueuedBatchTestApiIds()
      this.isShowOnlineImportModal = false
      this.isShowSubscribeImportModal = false
    },
    handleOpenUrl(url) {
      void openUrl(url)
    },
    handleChangeAllowUpdateAlert(api, enable) {
      api.allowShowUpdateAlert = enable
      void setAllowShowUserApiUpdateAlert(api.id, enable)
    },
    getBatchTestButtonText() {
      if (this.isBatchTesting && this.batchTestMode === 'quick') return `${STOP_LATENCY_TEST_BUTTON_TEXT} (${this.batchTestProgress.current}/${this.batchTestProgress.total})`
      if (this.isPreparingSamples) return this.$t('user_api__test_latency_preparing')
      return this.$t('user_api__btn_test_latency_all')
    },
    isBatchTestButtonDisabled() {
      if (this.isBatchTesting) return this.batchTestMode !== 'quick'
      return !this.apiList.length || this.isExporting || this.isResubscribing || (this.isPreparingSamples || !!this.activeTestApiIds.length || !!this.preparingTestApiIds.length || !!this.pendingStopTestApiIds.length)
    },
    getBatchFullTestButtonText() {
      if (this.isBatchTesting && this.batchTestMode === 'full') return `${STOP_LATENCY_TEST_BUTTON_TEXT} (${this.batchTestProgress.current}/${this.batchTestProgress.total})`
      if (this.isPreparingSamples && this.batchTestMode === 'full') return this.$t('user_api__test_latency_full_preparing')
      return this.$t('user_api__btn_test_latency_all_full')
    },
    isBatchFullTestButtonDisabled() {
      if (this.isBatchTesting) return this.batchTestMode !== 'full'
      return !this.apiList.length || this.isExporting || this.isResubscribing || (this.isPreparingSamples || !!this.activeTestApiIds.length || !!this.preparingTestApiIds.length || !!this.pendingStopTestApiIds.length)
    },
    getRunningTestMode(apiId) {
      if (!this.isApiTesting(apiId)) return ''
      return this.testStates[apiId]?.mode ?? 'quick'
    },
    isTestButtonDisabled(apiId) {
      if (this.isApiTesting(apiId)) return this.getRunningTestMode(apiId) === 'full'
      return this.isBusy
    },
    isFullTestButtonDisabled(apiId) {
      if (this.isApiTesting(apiId)) return this.getRunningTestMode(apiId) === 'quick'
      return this.isBusy
    },
    isRemoveButtonDisabled() {
      return this.isExporting || this.isResubscribing
    },
    getBatchTestRunningText() {
      return this.$t('user_api__btn_test_latency_running', {
        current: this.batchTestProgress.current,
        total: this.batchTestProgress.total,
      })
    },
    getResubscribeButtonText() {
      return this.isResubscribing
        ? this.$t('user_api__btn_resubscribing')
        : this.$t('user_api__btn_resubscribe')
    },
    getTestButtonText(apiId) {
      return this.getRunningTestMode(apiId) === 'quick'
        ? STOP_LATENCY_TEST_BUTTON_TEXT
        : this.$t('user_api__btn_test_latency')
    },
    getFullTestButtonText(apiId) {
      return this.getRunningTestMode(apiId) === 'full'
        ? STOP_LATENCY_TEST_BUTTON_TEXT
        : this.$t('user_api__btn_test_latency_full')
    },
    buildFullTestState(results, extra = {}) {
      return {
        mode: 'full',
        status: 'testing',
        currentSource: '',
        currentQuality: '',
        currentIndex: 0,
        total: TEST_SOURCE_ORDER.length,
        latency: 0,
        results: [...results],
        ...extra,
      }
    },
    getFullTestCounts(results = []) {
      return results.reduce((counts, entry) => {
        if (entry?.status === 'success') counts.success++
        else if (entry?.status === 'error') counts.error++
        else counts.skipped++
        return counts
      }, {
        success: 0,
        error: 0,
        skipped: 0,
      })
    },
    formatFullTestResultItem(entry) {
      const sourceName = this.getSourceDisplayName(entry.source)
      if (entry.status === 'success') {
        const latencyText = typeof entry.latency === 'number' ? ` ${formatSeconds(entry.latency)}s` : ''
        const qualityText = entry.quality ? ` · ${entry.quality}` : ''
        return `${sourceName}${latencyText}${qualityText}`
      }
      return `${sourceName}: ${entry.message || this.$t('user_api__test_latency_failed')}`
    },
    getFullTestSummary(state) {
      if (state.status === 'loading') return state.message || this.$t('user_api__test_latency_full_preparing')
      if (state.status === 'testing') {
        return this.$t('user_api__test_latency_full_progress', {
          current: Math.max(0, Math.min(state.currentIndex || 0, state.total || TEST_SOURCE_ORDER.length)),
          total: state.total || TEST_SOURCE_ORDER.length,
        })
      }
      if (state.status === 'error' && !state.results?.length && state.message) return state.message
      const counts = this.getFullTestCounts(state.results)
      return this.$t('user_api__test_latency_full_summary', {
        success: counts.success,
        total: state.total || TEST_SOURCE_ORDER.length,
      })
    },
    getFullTestDetail(state) {
      if (state.status === 'loading') return state.message || ''
      const results = Array.isArray(state.results) ? state.results : []
      if (!results.length && state.status === 'error' && state.message) return state.message
      const parts = []
      if (state.status === 'testing' && state.currentSource) {
        if (state.currentQuality) {
          parts.push(this.$t('user_api__test_latency_verifying_source', {
            source: this.getSourceDisplayName(state.currentSource),
            quality: state.currentQuality,
          }))
        } else {
          parts.push(this.$t('user_api__test_latency_full_progress_source', {
            source: this.getSourceDisplayName(state.currentSource),
            current: state.currentIndex || 0,
            total: state.total || TEST_SOURCE_ORDER.length,
          }))
        }
      }
      const successItems = results.filter(entry => entry.status === 'success').map(entry => this.formatFullTestResultItem(entry))
      const errorItems = results.filter(entry => entry.status === 'error').map(entry => this.formatFullTestResultItem(entry))
      const skippedSources = TEST_SOURCE_ORDER
        .filter(source => !results.some(entry => entry.source === source))
        .map(source => this.getSourceDisplayName(source))
      const skippedItems = results
        .filter(entry => entry.status !== 'success' && entry.status !== 'error')
        .map(entry => this.formatFullTestResultItem(entry))
      if (successItems.length) parts.push(`${this.$t('user_api__test_latency_full_available')}: ${successItems.join(' / ')}`)
      if (errorItems.length) parts.push(`${this.$t('user_api__test_latency_full_unavailable')}: ${errorItems.join(' / ')}`)
      const pendingItems = [...skippedItems, ...skippedSources]
      if (state.status !== 'testing' && pendingItems.length) parts.push(`${this.$t('user_api__test_latency_full_untested')}: ${pendingItems.join(' / ')}`)
      if (!parts.length && state.message) return state.message
      return parts.join(' · ')
    },
    getTestSummary(apiId) {
      const state = this.getDisplayTestState(apiId)
      if (!state) return ''
      if (state.mode === 'full') return this.getFullTestSummary(state)
      switch (state.status) {
        case 'success':
          return state.source
            ? `${this.getSourceDisplayName(state.source)} · ${formatSeconds(state.latency)} s`
            : `${formatSeconds(state.latency)} s`
        case 'error':
          return state.source
            ? `${this.getSourceDisplayName(state.source)} · ${this.$t('user_api__test_latency_failed')}`
            : this.$t('user_api__test_latency_failed')
        default:
          return state.message
      }
    },
    getTestDetail(apiId) {
      const state = this.getDisplayTestState(apiId)
      if (!state) return ''
      if (state.mode === 'full') return this.getFullTestDetail(state)
      if (state.status === 'success' && state.source && state.quality) {
        return `${this.$t('user_api__test_latency_hit_source', { source: this.getSourceDisplayName(state.source) })} · ${this.$t('user_api__test_latency_total', { total: `${formatSeconds(state.latency)}s` })} · ${this.$t('user_api__test_latency_detail', {
          source: this.getSourceDisplayName(state.source),
          quality: state.quality,
          init: state.initLatency,
          request: state.requestLatency,
          verify: state.verifyLatency ?? 0,
        })}`
      }
      if (state.status === 'error') {
        if (state.source && state.quality) {
          return `${state.message} · ${this.$t('user_api__test_latency_last_source', {
            source: this.getSourceDisplayName(state.source),
            quality: state.quality,
          })}`
        }
        return state.message
      }
      if (state.status === 'testing' && state.source && state.quality) {
        return this.$t('user_api__test_latency_verifying_source', {
          source: this.getSourceDisplayName(state.source),
          quality: state.quality,
        })
      }
      return ''
    },
    getEmptyText() {
      return this.apiList.length ? this.$t('user_api__empty_filtered') : this.$t('user_api__noitem')
    },
    getApiTestStatus(apiId) {
      return this.getDisplayTestState(apiId)?.status ?? 'untested'
    },
    isApiSelected(apiId) {
      return this.selectedApiIds.includes(apiId)
    },
    matchResultFilter(api) {
      switch (this.resultFilter) {
        case 'success':
          return this.getApiTestStatus(api.id) === 'success'
        case 'error':
          return this.getApiTestStatus(api.id) === 'error'
        case 'untested':
          return !this.getDisplayTestState(api.id)
        case 'selected':
          return this.isApiSelected(api.id)
        default:
          return true
      }
    },
    getSourceDisplayName(source) {
      return this.sourceNames[source] ?? source
    },
    getApiSourceList(api) {
      if (!api.sources) return []
      return Object.entries(api.sources)
        .filter(([, info]) => info.type === 'music')
        .map(([source]) => source)
    },
    setTestState(apiId, state) {
      this.testStates = {
        ...this.testStates,
        [apiId]: state,
      }
    },
    getDisplayTestState(apiId) {
      if (this.queuedBatchTestApiIds.includes(apiId)) {
        return {
          mode: this.batchTestMode || 'quick',
          status: 'loading',
          message: this.batchTestMode === 'full'
            ? this.$t('user_api__test_latency_full_preparing')
            : this.$t('user_api__test_latency_preparing'),
        }
      }
      return this.testStates[apiId]
    },
    addPreparingTestApiId(apiId) {
      if (this.preparingTestApiIds.includes(apiId)) return
      this.preparingTestApiIds = [...this.preparingTestApiIds, apiId]
    },
    removePreparingTestApiId(apiId) {
      if (!this.preparingTestApiIds.includes(apiId)) return
      this.preparingTestApiIds = this.preparingTestApiIds.filter(id => id !== apiId)
    },
    addPendingStopTestApiId(apiId) {
      if (this.pendingStopTestApiIds.includes(apiId)) return
      this.pendingStopTestApiIds = [...this.pendingStopTestApiIds, apiId]
    },
    removePendingStopTestApiId(apiId) {
      if (!this.pendingStopTestApiIds.includes(apiId)) return
      this.pendingStopTestApiIds = this.pendingStopTestApiIds.filter(id => id !== apiId)
    },
    isPendingStopTestApi(apiId) {
      return this.pendingStopTestApiIds.includes(apiId)
    },
    isApiTesting(apiId) {
      return this.activeTestApiIds.includes(apiId) || this.preparingTestApiIds.includes(apiId)
    },
    addActiveTestApiId(apiId) {
      if (this.activeTestApiIds.includes(apiId)) return
      this.activeTestApiIds = [...this.activeTestApiIds, apiId]
    },
    removeActiveTestApiId(apiId) {
      if (!this.activeTestApiIds.includes(apiId)) return
      this.activeTestApiIds = this.activeTestApiIds.filter(id => id !== apiId)
    },
    markRemovedDuringBatchApi(apiId) {
      if (this.removedDuringBatchApiIds.includes(apiId)) return
      this.removedDuringBatchApiIds = [...this.removedDuringBatchApiIds, apiId]
    },
    isRemovedDuringBatchApi(apiId) {
      return this.removedDuringBatchApiIds.includes(apiId)
    },
    removeQueuedBatchTestApiId(apiId) {
      if (!this.queuedBatchTestApiIds.includes(apiId)) return
      this.queuedBatchTestApiIds = this.queuedBatchTestApiIds.filter(id => id !== apiId)
    },
    clearQueuedBatchTestApiIds() {
      if (!this.queuedBatchTestApiIds.length) return
      this.queuedBatchTestApiIds = []
    },
    stopLatencyTest(apiId) {
      this.addPendingStopTestApiId(apiId)
      const mode = this.testStates[apiId]?.mode
      this.setTestState(apiId, {
        ...(mode ? { mode } : {}),
        status: 'loading',
        message: STOPPING_LATENCY_TEST_MESSAGE,
      })
      this.cancelSamplePrepareWaiter(apiId)
      this.cancelVerifyTask(apiId)
      if (this.activeTestApiIds.includes(apiId)) cancelUserApiLatencyTest(apiId)
    },
    stopAllLatencyTests() {
      this.isBatchStopRequested = true
      this.cancelSamplePrepareWaiter(BATCH_SAMPLE_PREPARE_KEY)
      for (const apiId of new Set([...this.preparingTestApiIds, ...this.activeTestApiIds])) {
        this.stopLatencyTest(apiId)
      }
    },
    async findLatencyTestMusics(source) {
      const sampleKeys = new Set()
      const samples = []
      for (const keyword of TEST_SEARCH_KEYWORDS) {
        try {
          const result = await musicSdk[source].musicSearch.search(keyword, 1, TEST_SEARCH_RESULT_LIMIT)
          for (const musicInfo of selectTestMusics(result)) {
            const sampleKey = getLatencyTestSampleKey(musicInfo)
            if (sampleKeys.has(sampleKey)) continue
            sampleKeys.add(sampleKey)
            samples.push(musicInfo)
            if (samples.length >= MAX_TEST_SAMPLES_PER_SOURCE) return samples
          }
        } catch {}
      }
      if (samples.length) return samples
      throw new Error(`${this.getSourceDisplayName(source)} ${this.$t('user_api__test_latency_search_failed')}`)
    },
    async getLatencyTestSamples(options = {}) {
      if (options.forceRefresh && !this.latencyTestSamplesPromise) this.invalidateLatencyTestSamples()
      if (this.latencyTestSamples) return this.latencyTestSamples
      if (this.latencyTestSamplesPromise) return this.latencyTestSamplesPromise
      this.isPreparingSamples = true
      this.latencyTestSamplesPromise = Promise.all(TEST_SOURCE_ORDER.map(async source => {
        try {
          return [source, await this.findLatencyTestMusics(source)]
        } catch {
          return null
        }
      })).then((entries) => {
        const samples = Object.fromEntries(entries.filter(Boolean))
        if (!Object.keys(samples).length) throw new Error(this.$t('user_api__test_latency_search_failed'))
        this.latencyTestSamples = samples
        return samples
      }).finally(() => {
        this.isPreparingSamples = false
        this.latencyTestSamplesPromise = null
      })
      return this.latencyTestSamplesPromise
    },
    normalizeLatencyResult(result) {
      return {
        ...result,
        latency: Math.max(0, Math.trunc(result.latency)),
        initLatency: Math.max(0, Math.trunc(result.initLatency)),
        requestLatency: Math.max(0, Math.trunc(result.requestLatency)),
        verifyLatency: Math.max(0, Math.trunc(result.verifyLatency ?? 0)),
      }
    },
    normalizeLatencyTestErrorMessage(error) {
      const rawMessage = error instanceof Error ? error.message : String(error)
      const message = rawMessage
        .replace(/^Error invoking remote method '[^']+':\s*/i, '')
        .replace(/^Error:\s*/i, '')
      switch (message) {
        case '当前源没有可自动测试的在线平台':
          return this.$t('user_api__test_latency_no_source')
        case 'api init timeout':
          return this.$t('user_api__test_latency_init_timeout')
        case 'api not found':
          return this.$t('user_api__test_latency_source_missing')
        case 'Request timeout':
          return requestMsg.timeout
        case 'Cancel request':
          return requestMsg.cancelRequest
        case 'play verify timeout':
          return this.$t('user_api__test_latency_verify_timeout')
        case 'play verify failed':
          return this.$t('user_api__test_latency_verify_failed')
        default:
          return message
      }
    },
    async executeLatencyTest(apiId, samples, onRequestResult = null) {
      const startedAt = Date.now()
      let remainingSamples = cloneLatencyTestSamples(samples)
      let lastVerifyError = null

      while (hasLatencyTestSamples(remainingSamples)) {
        this.throwIfLatencyTestStopped(apiId)
        const result = this.normalizeLatencyResult(await testUserApiLatency({
          id: apiId,
          samples: remainingSamples,
        }))
        this.throwIfLatencyTestStopped(apiId)
        if (!result.url) throw new Error('未获取到有效播放链接')
        void getUserApiList().then((list) => {
          userApi.list = list
        }).catch(() => {})
        onRequestResult?.(result)

        try {
          this.throwIfLatencyTestStopped(apiId)
          const verifyTask = createStrictVerifyPlayableUrlTask(result.url)
          this.setVerifyTask(apiId, verifyTask)
          const verifyLatency = await verifyTask.promise.finally(() => {
            this.clearVerifyTask(apiId, verifyTask)
          })
          this.throwIfLatencyTestStopped(apiId)
          return this.normalizeLatencyResult({
            ...result,
            verifyLatency,
            latency: Date.now() - startedAt,
          })
        } catch (err) {
          if (this.isLatencyTestCancelError(err)) throw err
          lastVerifyError = err
          if (!result.source || !result.musicInfo) throw err
          remainingSamples = removeLatencyTestSample(remainingSamples, result.source, result.musicInfo)
        }
      }

      throw lastVerifyError instanceof Error ? lastVerifyError : new Error('未获取到有效播放链接')
    },
    async runLatencyTest(api, samples) {
      this.addActiveTestApiId(api.id)
      this.setTestState(api.id, {
        mode: 'quick',
        status: 'testing',
        message: this.$t('user_api__test_latency_testing'),
      })
      let lastAttemptResult = null
      try {
        const strictResult = await this.executeLatencyTest(api.id, samples, result => {
          lastAttemptResult = {
            source: result.source,
            quality: result.quality,
            musicInfo: result.musicInfo,
          }
          this.setTestState(api.id, {
            ...result,
            mode: 'quick',
            status: 'testing',
            message: this.$t('user_api__test_latency_verifying'),
          })
        })
        this.setTestState(api.id, {
          ...strictResult,
          mode: 'quick',
          status: 'success',
        })
        return true
      } catch (err) {
        const message = this.normalizeLatencyTestErrorMessage(err)
        if (message === requestMsg.cancelRequest) {
          this.cancelVerifyTask(api.id)
          this.removeTestState(api.id)
          return null
        }
        this.setTestState(api.id, {
          mode: 'quick',
          status: 'error',
          message,
          source: lastAttemptResult?.source,
          quality: lastAttemptResult?.quality,
        })
        return false
      } finally {
        this.clearVerifyTask(api.id)
        this.removeActiveTestApiId(api.id)
        this.removePendingStopTestApiId(api.id)
      }
    },
    async runFullLatencyTest(api, samples) {
      this.addActiveTestApiId(api.id)
      const total = TEST_SOURCE_ORDER.length
      const results = []
      const startedAt = Date.now()
      this.setTestState(api.id, this.buildFullTestState(results, {
        status: 'testing',
        message: this.$t('user_api__test_latency_full_testing'),
      }))
      try {
        for (const [index, source] of TEST_SOURCE_ORDER.entries()) {
          this.throwIfLatencyTestStopped(api.id)
          const currentIndex = index + 1
          const sourceSamples = getLatencyTestSourceSamples(samples, source)
          this.setTestState(api.id, this.buildFullTestState(results, {
            status: 'testing',
            currentSource: source,
            currentQuality: '',
            currentIndex,
            total,
            message: this.$t('user_api__test_latency_full_progress_source', {
              source: this.getSourceDisplayName(source),
              current: currentIndex,
              total,
            }),
          }))
          if (!hasLatencyTestSamples(sourceSamples)) {
            results.push({
              source,
              status: 'skipped',
              message: this.$t('user_api__test_latency_search_failed'),
            })
            continue
          }
          let lastAttemptResult = {
            source,
            quality: '',
          }
          try {
            const strictResult = await this.executeLatencyTest(api.id, sourceSamples, result => {
              lastAttemptResult = {
                source: result.source ?? source,
                quality: result.quality ?? '',
                musicInfo: result.musicInfo,
              }
              this.setTestState(api.id, this.buildFullTestState(results, {
                status: 'testing',
                currentSource: result.source ?? source,
                currentQuality: result.quality ?? '',
                currentIndex,
                total,
                message: this.$t('user_api__test_latency_verifying'),
              }))
            })
            results.push({
              ...strictResult,
              source,
              status: 'success',
            })
          } catch (err) {
            if (this.isLatencyTestCancelError(err)) throw err
            results.push({
              source,
              status: 'error',
              quality: lastAttemptResult.quality,
              message: this.normalizeLatencyTestErrorMessage(err),
            })
          }
        }

        const hasSuccess = results.some(entry => entry.status === 'success')
        this.setTestState(api.id, this.buildFullTestState(results, {
          status: hasSuccess ? 'success' : 'error',
          total,
          latency: Date.now() - startedAt,
        }))
        return hasSuccess
      } catch (err) {
        const message = this.normalizeLatencyTestErrorMessage(err)
        if (message === requestMsg.cancelRequest) {
          this.cancelVerifyTask(api.id)
          this.removeTestState(api.id)
          return null
        }
        const hasSuccess = results.some(entry => entry.status === 'success')
        this.setTestState(api.id, this.buildFullTestState(results, {
          status: hasSuccess ? 'success' : 'error',
          total,
          latency: Date.now() - startedAt,
          message,
        }))
        return hasSuccess
      } finally {
        this.clearVerifyTask(api.id)
        this.removeActiveTestApiId(api.id)
        this.removePendingStopTestApiId(api.id)
      }
    },
    async handleTestLatency(api) {
      if (this.isApiTesting(api.id)) {
        this.stopLatencyTest(api.id)
        return
      }
      if (this.isBusy) return
      this.addPreparingTestApiId(api.id)
      this.setTestState(api.id, {
        mode: 'quick',
        status: 'loading',
        message: this.$t('user_api__test_latency_preparing'),
      })
      try {
        const samples = await this.waitForLatencyTestSamples(api.id)
        if (this.isPendingStopTestApi(api.id)) {
          this.removeTestState(api.id)
          return
        }
        await this.runLatencyTest(api, samples)
      } catch (err) {
        const message = this.normalizeLatencyTestErrorMessage(err)
        if (message === requestMsg.cancelRequest) this.removeTestState(api.id)
        else {
          this.setTestState(api.id, {
            status: 'error',
            message,
          })
        }
      } finally {
        this.removePreparingTestApiId(api.id)
        this.removePendingStopTestApiId(api.id)
      }
    },
    async handleTestFullLatency(api) {
      if (this.isApiTesting(api.id)) {
        this.stopLatencyTest(api.id)
        return
      }
      if (this.isBusy) return
      this.addPreparingTestApiId(api.id)
      this.setTestState(api.id, {
        mode: 'full',
        status: 'loading',
        message: this.$t('user_api__test_latency_full_preparing'),
      })
      try {
        const samples = await this.waitForLatencyTestSamples(api.id)
        if (this.isPendingStopTestApi(api.id)) {
          this.removeTestState(api.id)
          return
        }
        await this.runFullLatencyTest(api, samples)
      } catch (err) {
        const message = this.normalizeLatencyTestErrorMessage(err)
        if (message === requestMsg.cancelRequest) this.removeTestState(api.id)
        else {
          this.setTestState(api.id, this.buildFullTestState([], {
            status: 'error',
            message,
          }))
        }
      } finally {
        this.removePreparingTestApiId(api.id)
        this.removePendingStopTestApiId(api.id)
      }
    },
    async runBatchLatencyTest(mode) {
      const apiQueue = [...this.apiList]
      const isFullMode = mode === 'full'
      const concurrency = isFullMode ? BATCH_FULL_TEST_CONCURRENCY : BATCH_TEST_CONCURRENCY
      this.isBatchTesting = true
      this.batchTestMode = mode
      this.isBatchStopRequested = false
      this.removedDuringBatchApiIds = []
      this.queuedBatchTestApiIds = apiQueue.map(api => api.id)
      this.batchTestProgress = {
        current: 0,
        total: apiQueue.length,
      }
      let success = 0
      let fail = 0
      try {
        const samples = await this.waitForLatencyTestSamples(BATCH_SAMPLE_PREPARE_KEY, {
          forceRefresh: !!this.latencyTestSamples && !this.latencyTestSamplesPromise,
        })
        if (this.isBatchStopRequested) return
        let currentIndex = 0
        const runWorker = async() => {
          while (currentIndex < apiQueue.length) {
            if (this.isBatchStopRequested) return
            const api = apiQueue[currentIndex++]
            if (!api) return
            if (this.isRemovedDuringBatchApi(api.id) || !this.apiList.some(item => item.id === api.id)) {
              this.removeQueuedBatchTestApiId(api.id)
              this.batchTestProgress = {
                current: this.batchTestProgress.current + 1,
                total: this.batchTestProgress.total,
              }
              continue
            }
            this.removeQueuedBatchTestApiId(api.id)
            const result = isFullMode
              ? await this.runFullLatencyTest(api, samples)
              : await this.runLatencyTest(api, samples)
            if (result === true) success++
            else if (result === false) fail++
            this.batchTestProgress = {
              current: this.batchTestProgress.current + 1,
              total: this.batchTestProgress.total,
            }
          }
        }
        await Promise.all(Array.from({
          length: Math.max(1, Math.min(concurrency, apiQueue.length)),
        }, async() => {
          await runWorker()
        }))
        if (!this.isBatchStopRequested) {
          await dialog(this.$t(isFullMode ? 'user_api__test_latency_batch_full_result' : 'user_api__test_latency_batch_result', { success, fail }))
        }
      } catch (err) {
        const message = this.normalizeLatencyTestErrorMessage(err)
        if (message !== requestMsg.cancelRequest) void dialog(message)
      } finally {
        this.isBatchTesting = false
        this.batchTestMode = ''
        this.isBatchStopRequested = false
        this.removedDuringBatchApiIds = []
        this.clearQueuedBatchTestApiIds()
        this.batchTestProgress = {
          current: 0,
          total: this.apiList.length,
        }
      }
    },
    async handleTestAllLatency() {
      if (this.isBatchTesting && this.batchTestMode === 'quick') {
        this.stopAllLatencyTests()
        return
      }
      if (!this.apiList.length || this.isBusy) return
      await this.runBatchLatencyTest('quick')
    },
    async handleTestAllFullLatency() {
      if (this.isBatchTesting && this.batchTestMode === 'full') {
        this.stopAllLatencyTests()
        return
      }
      if (!this.apiList.length || this.isBusy) return
      await this.runBatchLatencyTest('full')
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  width: 100%;
  padding: 0;
  display: flex;
  flex-flow: column nowrap;
  min-height: min(520px, 70vh);
  max-height: 100%;
  background:
    radial-gradient(circle at 14% 0, var(--color-primary-light-300-alpha-800), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.985), rgba(248, 248, 250, 0.965));
  border-radius: 0 0 24px 24px;
  overflow: hidden;
}

.header {
  position: relative;
  flex: none;
  z-index: 2;
  padding: 0 26px 18px;
  display: flex;
  align-items: center;
  gap: 14px;

  &::after {
    .mixin-after();
    left: 26px;
    right: 26px;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(198, 47, 47, 0.22), transparent);
  }
}

.titleMark {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .08em;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark-300));
  box-shadow: 0 14px 26px var(--color-primary-alpha-700);
}

.titleText {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  h2 {
    min-width: 0;
    font-size: 19px;
    font-weight: 800;
    color: var(--ui-text-primary);
    line-height: var(--ui-line-compact);
    letter-spacing: .01em;
    .mixin-ellipsis-1();
  }
}

.headerActions {
  margin-left: auto;
  flex: none;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.headerCloseBtn {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-secondary);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(214, 214, 220, 0.92);
  cursor: pointer;
  transition: @transition-fast;
  transition-property: color, background-color, box-shadow, transform;

  &:hover {
    color: var(--ui-text-accent);
    background: var(--color-primary-light-300-alpha-800);
    box-shadow: inset 0 0 0 1px var(--color-primary-alpha-400);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.toolbar {
  flex: none;
  position: relative;
  z-index: 2;
  padding: 12px 24px 10px;
  display: flex;
  flex-flow: column nowrap;
  gap: 8px;
}

.toolbarRow {
  min-height: 34px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.toolbarRowTrack {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  min-width: max-content;
  padding: 2px 0;
}

.toolbarRowSecondary {
  padding-bottom: 2px;
}

.categoryGroup,
.filterGroup,
.selectGroup {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  flex: none;
}

.categoryGroup {
  min-width: max-content;
}

.toolbarBtn {
  height: 30px;
  max-width: 220px;
  padding: 0 12px !important;
  border-radius: 999px;
  font-size: var(--ui-font-meta);
  color: var(--ui-text-secondary);
  border-color: rgba(213, 213, 218, 0.92);
  background: rgba(255, 255, 255, 0.74);
  .mixin-ellipsis-1();
}

.toolbarActionBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.toolbarBtnLoading {
  color: var(--ui-text-accent);
  border-color: var(--color-primary-alpha-500);
  background: var(--color-primary-light-300-alpha-800);
}

.spinningIcon {
  animation: toolbarSpin 1s linear infinite;
}

.toolbarBtn_active {
  color: var(--ui-text-accent);
  border-color: var(--color-primary-alpha-500);
  background: var(--color-primary-light-300-alpha-800);
}

@keyframes toolbarSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.selectedCount {
  flex: none;
  font-size: var(--ui-font-meta);
  color: var(--ui-text-accent);
  font-weight: 700;
  white-space: nowrap;
}

.headerBtn {
  min-width: 108px;
  height: 34px;
  padding: 0 14px !important;
  border-radius: 999px;
  font-size: var(--ui-font-caption);
  color: var(--ui-text-accent);
  border-color: var(--color-primary-alpha-400);
  background: rgba(255, 255, 255, 0.8);

  &:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-light-300-alpha-800);
  }
}

.headerBtnSecondary {
  color: var(--ui-text-secondary);
  border-color: rgba(213, 213, 218, 0.92);
  background: rgba(255, 255, 255, 0.74);

  &:hover {
    color: var(--ui-text-accent);
    border-color: var(--color-primary-alpha-500);
    background: var(--color-primary-light-300-alpha-800);
  }
}

.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-dark-200));
  color: #fff;
  font-size: var(--ui-font-meta);
  font-weight: 800;
  box-shadow: 0 10px 20px var(--color-primary-alpha-800);
}

.content {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  max-height: none;
  margin: 0;
  padding: 6px 24px 8px;
  overflow-y: auto;
  list-style: none;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 999px;
    background: var(--color-primary-alpha-800);
    background-clip: content-box;
  }
}

.listItem {
  position: relative;
  display: flex;
  align-items: center;
  padding: 15px 16px 14px 18px;
  margin-bottom: 10px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(249, 249, 251, 0.9));
  cursor: pointer;
  transition: @transition-fast;
  transition-property: transform, background-color, border-color, box-shadow;
  border: 1px solid rgba(226, 226, 230, 0.92);
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.045),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);

  &:hover {
    transform: translateY(-1px);
    border-color: var(--color-primary-light-100-alpha-600);
    box-shadow:
      0 16px 28px rgba(15, 23, 42, 0.075),
      inset 0 1px 0 rgba(255, 255, 255, 0.76);
  }

  &.active {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), var(--color-primary-light-300-alpha-800));
    border-color: var(--color-primary-alpha-500);
    box-shadow:
      0 16px 32px var(--color-primary-alpha-900),
      inset 0 0 0 1px var(--color-primary-light-300-alpha-800),
      inset 0 1px 0 rgba(255, 255, 255, 0.78);

    .activeDot {
      opacity: 1;
      transform: scaleY(1);
    }
  }
}

.activeDot {
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 4px;
  border-radius: 0 999px 999px 0;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-dark-200));
  opacity: 0;
  transform: scaleY(.46);
  transform-origin: center;
  transition: @transition-fast;
  transition-property: opacity, transform;
}

.cardLeft {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 4px;
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: 8px;

  h3 {
    min-width: 0;
    font-size: 16px;
    font-weight: 800;
    color: var(--ui-text-primary);
    line-height: var(--ui-line-compact);
    word-break: break-all;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.version {
  font-size: var(--ui-font-meta);
  color: var(--ui-text-accent);
  background: var(--color-primary-light-300-alpha-800);
  padding: 2px 7px;
  border-radius: 999px;
  flex: none;
  font-weight: 700;
}

.categoryTag {
  flex: none;
  max-width: 180px;
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: var(--ui-font-meta);
  color: var(--ui-text-secondary);
  background: rgba(244, 244, 246, 0.94);
  border: 1px solid rgba(220, 220, 224, 0.96);
  .mixin-ellipsis-1();
}

.categoryTag_subscribe {
  color: var(--ui-text-accent);
  background: rgba(255, 242, 242, 0.96);
  border-color: var(--color-primary-alpha-300);
}

.cardMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--ui-font-caption);
  line-height: var(--ui-line-compact);
  color: var(--ui-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author {
  flex: none;
  color: var(--ui-text-secondary);
  font-weight: 600;

  &::before {
    content: '@';
  }
}

.desc {
  min-width: 0;
  color: var(--ui-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sourceRow {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sourceTag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: var(--ui-font-meta);
  color: var(--ui-text-accent);
  background: var(--color-primary-light-300-alpha-800);
  border: 1px solid var(--color-primary-alpha-300);
}

.checkbox {
  font-size: var(--ui-font-caption);
}

.checkboxRow {
  margin-top: 8px;
  display: flex;
  align-items: center;
  min-height: 24px;
  opacity: .84;
}

.testRow {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 30px;
}

.testBtn {
  flex: none;
  min-width: 74px;
  height: 28px;
  line-height: 28px;
  padding: 0 10px !important;
  border-radius: 999px;
  font-size: var(--ui-font-meta);
  color: var(--ui-text-accent);
  border: 1px solid var(--color-primary-alpha-400);
  background: rgba(255, 255, 255, 0.72);

  &:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-light-300-alpha-800);
  }
}

.testBtnSecondary {
  color: var(--ui-text-secondary);
  border-color: rgba(213, 213, 218, 0.92);

  &:hover {
    color: var(--ui-text-accent);
    border-color: var(--color-primary-alpha-500);
  }
}

.testStatus {
  min-width: 0;
  font-size: var(--ui-font-meta);
  font-weight: 700;
  color: var(--ui-text-secondary);
  .mixin-ellipsis-1();
}

.testStatus_success {
  color: #1f8f5f;
}

.testStatus_error {
  color: var(--color-primary);
}

.testStatus_loading,
.testStatus_testing {
  color: var(--ui-text-accent);
}

.testDetail {
  margin-top: 5px;
  font-size: var(--ui-font-meta);
  line-height: 1.45;
  color: var(--ui-text-tertiary);
  word-break: break-word;
}

.cardRight {
  flex: none;
  margin-left: 14px;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: 8px;
}

.selectBtn {
  min-width: 62px;
  height: 30px;
  line-height: 30px;
  padding: 0 10px !important;
  border-radius: 999px;
  font-size: var(--ui-font-meta);
  color: var(--ui-text-secondary);
  border-color: rgba(213, 213, 218, 0.92);
  background: rgba(255, 255, 255, 0.74);
}

.selectBtn_active {
  color: var(--ui-text-accent);
  border-color: var(--color-primary-alpha-500);
  background: var(--color-primary-light-300-alpha-800);
}

.removeBtn {
  height: 38px;
  width: 38px;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 13px;
  color: var(--ui-text-tertiary);
  opacity: .78;
  background: rgba(255, 255, 255, 0.68);
  border-color: rgba(226, 226, 230, 0.92);
  transition: @transition-fast;
  transition-property: color, opacity, background-color, border-color, transform, box-shadow;

  svg {
    width: 56%;
  }

  &:hover {
    opacity: 1;
    color: var(--color-primary);
    background: var(--color-primary-light-300-alpha-800);
    border-color: var(--color-primary-light-100-alpha-600);
    box-shadow: 0 10px 20px var(--color-primary-alpha-900);
  }
}

.noitem {
  height: 170px;
  margin-top: 8px;
  font-size: var(--ui-font-body);
  color: var(--ui-text-tertiary);
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(246, 246, 248, 0.72));
  border: 1px dashed rgba(190, 193, 201, 0.78);
}

.noitemIcon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-accent);
  font-size: var(--ui-font-caption);
  font-weight: 800;
  letter-spacing: .08em;
  background: var(--color-primary-light-300-alpha-800);
}

.note {
  flex: none;
  position: relative;
  z-index: 2;
  margin: 8px 24px 0;
  padding: 0 0 2px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.noteTrack {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 32px;
  min-width: max-content;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(246, 246, 248, 0.82);
  border: 1px solid rgba(229, 229, 232, 0.9);
}

.docItem {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.docLink,
.docHelpBtn,
.noteInfoBtn {
  padding: 0;
  border: 0;
  background: transparent;
}

.docLink {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ui-font-meta);
  line-height: var(--ui-line-body);
  color: var(--ui-text-accent);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.noteInfoBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ui-font-meta);
  line-height: var(--ui-line-body);
  color: var(--ui-text-secondary);
  cursor: pointer;

  &:hover {
    color: var(--ui-text-accent);
  }
}

.docHelpBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-tertiary);
  cursor: pointer;
  opacity: .86;

  &:hover {
    color: var(--ui-text-accent);
    opacity: 1;
  }
}

.footer {
  flex: none;
  position: relative;
  z-index: 2;
  padding: 12px 24px 20px;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  min-width: 0;
}

.footerBtn {
  flex: 1 1 0;
  min-width: 0;
  height: 38px;
  line-height: 38px;
  padding: 0 10px !important;
  font-size: var(--ui-font-caption);
  border-radius: 13px;
  text-align: center;
  .mixin-ellipsis-1();
}

.primaryBtn {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-dark-200)) !important;
  box-shadow: 0 14px 26px var(--color-primary-alpha-700);

  &:hover {
    color: #fff;
    border-color: transparent;
    box-shadow: 0 16px 30px var(--color-primary-alpha-600);
  }
}

.dangerBtn {
  color: var(--color-primary);
  border-color: var(--color-primary-alpha-400);

  &:hover {
    background: var(--color-primary-light-300-alpha-800);
    border-color: var(--color-primary);
  }
}

.ruleLink {
  .mixin-ellipsis-1();
}

@media (max-width: 720px) {
  .header {
    padding-left: 22px;
    padding-right: 22px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .content,
  .footer,
  .toolbar {
    padding-left: 20px;
    padding-right: 20px;
  }

  .note {
    margin-left: 20px;
    margin-right: 20px;
  }

  .footerBtn {
    min-width: 0;
  }

  .headerActions {
    width: 100%;
    margin-left: 0;
    margin-top: 10px;
    justify-content: stretch;
  }

  .headerBtn {
    width: 100%;
  }

  .headerCloseBtn {
    margin-left: auto;
  }

  .toolbarActionBtn,
  .docLink,
  .docHelpBtn,
  .noteInfoBtn {
    justify-content: center;
  }
}
</style>
