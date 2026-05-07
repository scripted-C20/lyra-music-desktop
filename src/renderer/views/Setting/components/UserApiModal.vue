<template lang="pug">
material-modal(:show="modelValue" bg-close teleport="#view" width="min(704px, calc(100vw - 64px))" max-width="704px" max-height="82%" @close="handleClose")
  main.scroll(:class="$style.main")
    div(:class="$style.header")
      div(:class="$style.titleMark") API
      div(:class="$style.titleText")
        h2 {{ $t('user_api__title') }}
        span(v-if="apiList.length" :class="$style.count") {{ apiList.length }}
    ul.scroll(v-if="apiList.length" :class="$style.content")
      li(v-for="(api, index) in apiList" :key="api.id" :class="[$style.listItem, {[$style.active]: appSetting['common.apiSource'] == api.id}]" @click="handleSelectSource(api)")
        span(:class="$style.activeDot" aria-hidden="true")
        div(:class="$style.cardLeft")
          div(:class="$style.cardHeader")
            h3 {{ api.name }}
            span(v-if="api.version" :class="$style.version") {{ /^\d/.test(api.version) ? `v${api.version}` : api.version }}
          div(:class="$style.cardMeta")
            span(v-if="api.author" :class="$style.author") {{ api.author }}
            span(v-if="api.description" :class="$style.desc") {{ api.description }}
          div(:class="$style.checkboxRow" @click.stop)
            base-checkbox(:id="`user_api_${api.id}`" :model-value="api.allowShowUpdateAlert === true" :class="$style.checkbox" :label="$t('user_api__allow_show_update_alert')" @update:model-value="handleChangeAllowUpdateAlert(api, $event)")
        div(:class="$style.cardRight")
          base-btn(:class="$style.removeBtn" outline :aria-label="$t('user_api__btn_remove')" @click.stop="handleRemove(index)")
            app-icon(name="delete" :size="16")
    div(v-else :class="$style.content")
      div(:class="$style.noitem")
        span(:class="$style.noitemIcon") API
        span {{ $t('user_api__noitem') }}
    div(:class="$style.note")
      p(:class="$style.ruleLink")
        | {{ $t('user_api__readme') }}
        span.hover.underline(aria-label="https://lxmusic.toside.cn/desktop/custom-source" @click="handleOpenUrl('https://lyswhut.github.io/lx-music-doc/desktop/custom-source')") FAQ
      p {{ $t('user_api__note') }}
    div(:class="$style.footer")
      base-btn(:class="[$style.footerBtn, $style.primaryBtn]" @click="isShowOnlineImportModal = true") {{ $t('user_api__btn_import_online') }}
      base-btn(:class="$style.footerBtn" @click="handleImport") {{ $t('user_api__btn_import') }}
      base-btn(:class="$style.footerBtn" @click="isShowSubscribeImportModal = true") {{ $t('user_api__btn_import_subscribe') }}
      base-btn(v-if="apiList.length" :class="[$style.footerBtn, $style.dangerBtn]" @click="handleRemoveAll") {{ $t('user_api__btn_remove_all') }}
    UserApiOnlineImportModal(v-model:show="isShowOnlineImportModal" @import="importUserApi")
    UserApiSubscribeImportModal(v-model:show="isShowSubscribeImportModal" @imported="handleSubscribeImported")
</template>

<script>
import { importUserApi, removeUserApi, showSelectDialog, setAllowShowUserApiUpdateAlert, getUserApiList, setUserApi } from '@renderer/utils/ipc'
import { readFile } from '@common/utils/nodejs'
import { openUrl } from '@common/utils/electron'
import apiSourceInfo from '@renderer/utils/musicSdk/api-source-info'
import { userApi } from '@renderer/store'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { computed, ref } from '@common/utils/vueTools'
import { dialog } from '@renderer/plugins/Dialog'

import UserApiOnlineImportModal from './UserApiOnlineImportModal.vue'
import UserApiSubscribeImportModal from './UserApiSubscribeImportModal.vue'

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
      appSetting,
      isShowOnlineImportModal,
      isShowSubscribeImportModal,
    }
  },
  methods: {
    async importUserApi(script) {
      return importUserApi(script).then(({ apiList }) => {
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
    handleExport() {

    },
    async handleRemove(index) {
      const api = this.apiList[index]
      if (!api) return
      if (appSetting['common.apiSource'] == api.id) {
        let backApi = apiSourceInfo.find(api => !api.disabled)
        if (!backApi) backApi = userApi.list[0]
        updateSetting({ 'common.apiSource': backApi?.id ?? '' })
      }
      userApi.list = await removeUserApi([api.id])
    },
    async handleRemoveAll() {
      const count = this.apiList.length
      if (!count) return
      void dialog({
        message: this.$t('user_api__remove_all_confirm', { count }),
        confirmButtonText: this.$t('btn_confirm'),
        cancelButtonText: this.$t('btn_cancel'),
        showCancel: true,
      }).then(async confirmed => {
        if (!confirmed) return
        const ids = this.apiList.map(a => a.id)
        if (ids.some(id => id === appSetting['common.apiSource'])) {
          const backApi = apiSourceInfo.find(api => !api.disabled)
          updateSetting({ 'common.apiSource': backApi?.id ?? '' })
        }
        userApi.list = await removeUserApi(ids)
      }).catch(() => {})
    },
    async handleSelectSource(api) {
      if (appSetting['common.apiSource'] === api.id) return
      await setUserApi(api.id)
      updateSetting({ 'common.apiSource': api.id })
    },
    async handleSubscribeImported() {
      userApi.list = await getUserApiList()
    },
    handleClose() {
      this.$emit('update:modelValue', false)
    },
    handleOpenUrl(url) {
      void openUrl(url)
    },
    handleChangeAllowUpdateAlert(api, enable) {
      api.allowShowUpdateAlert = enable
      void setAllowShowUserApiUpdateAlert(api.id, enable)
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
  min-height: 0;
  max-height: 100%;
  background:
    radial-gradient(circle at 14% 0, var(--color-primary-light-300-alpha-800), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.985), rgba(248, 248, 250, 0.965));
  border-radius: 0 0 24px 24px;
  overflow: hidden;
}

.header {
  position: relative;
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
  flex: auto;
  min-height: 170px;
  max-height: min(430px, 48vh);
  padding: 14px 24px 10px;
  overflow-y: auto;

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

.cardRight {
  flex: none;
  margin-left: 14px;
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
  margin: 2px 24px 0;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: var(--ui-font-meta);
  line-height: var(--ui-line-body);
  color: var(--ui-text-tertiary);
  background: rgba(246, 246, 248, 0.76);
  border: 1px solid rgba(229, 229, 232, 0.82);

  p {
    + p {
      margin-top: 3px;
    }
  }
}

.footer {
  padding: 14px 24px 22px;
  display: flex;
  flex-flow: row wrap;
  gap: 10px;
}

.footerBtn {
  flex: 1;
  min-width: 118px;
  height: 40px;
  line-height: 40px;
  padding: 0 12px !important;
  font-size: var(--ui-font-body);
  border-radius: 14px;
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
  }

  .content,
  .footer {
    padding-left: 20px;
    padding-right: 20px;
  }

  .note {
    margin-left: 20px;
    margin-right: 20px;
  }

  .footerBtn {
    min-width: 46%;
  }
}
</style>
