<template>
  <div :class="$style.container">
    <div :class="$style.songListHeader">
      <div :class="$style.coverShell">
        <div :class="$style.songListHeaderLeft" :style="{ backgroundImage: 'url('+(picUrl || listDetailInfo.info.img)+')' }">
          <span v-if="listDetailInfo.info.play_count" :class="$style.playNum">{{ listDetailInfo.info.play_count }}</span>
        </div>
      </div>
      <div :class="$style.songListHeaderMiddle">
        <div :class="$style.metaRow">
          <span :class="$style.typeTag">{{ $t('song_list') }}</span>
          <span v-if="listDetailInfo.info.author" :class="$style.metaTag">{{ listDetailInfo.info.author }}</span>
          <span v-if="listDetailInfo.info.play_count" :class="$style.metaTag">{{ listDetailInfo.info.play_count }}</span>
        </div>
        <h3 :title="listDetailInfo.info.name">{{ listDetailInfo.info.name }}</h3>
        <p v-if="listDetailInfo.info.desc" :title="listDetailInfo.info.desc">{{ listDetailInfo.info.desc }}</p>
      </div>
      <div :class="$style.songListHeaderRight">
        <base-btn
          :class="[$style.headerRightBtn, $style.primaryBtn]"
          :disabled="!!listDetailInfo.noItemLabel"
          @click="playSongListDetail(listDetailInfo.id, listDetailInfo.source, listDetailInfo.list)"
        >
          {{ $t('list__play') }}
        </base-btn>
        <base-btn
          :class="$style.headerRightBtn"
          :disabled="!!listDetailInfo.noItemLabel"
          @click="addSongListDetail(listDetailInfo.id, listDetailInfo.source, listDetailInfo.info.name)"
        >
          {{ $t('list__collect') }}
        </base-btn>
        <base-btn :class="$style.headerRightBtn" @click="handleBack">{{ $t('back') }}</base-btn>
      </div>
    </div>
    <div :class="$style.list">
      <material-online-list
        ref="listRef"
        :page="listDetailInfo.page"
        :limit="listDetailInfo.limit"
        :total="listDetailInfo.total"
        :list="listDetailInfo.list"
        :current-list-id="currentListId"
        enable-search-bar
        :no-item="listDetailInfo.noItemLabel"
        @play-list="handlePlayList"
        @toggle-page="togglePage"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, ref, watch } from '@common/utils/vueTools'
import { listDetailInfo } from '@renderer/store/songList/state'
import { setVisibleListDetail } from '@renderer/store/songList/action'
import { useRouter } from '@common/utils/vueRouter'
import { addSongListDetail, playSongListDetail } from './action'
import useList from './useList'
import useKeyBack from './useKeyBack'


const source = ref<LX.OnlineSource>('kw')
const id = ref<string>('')
const page = ref<number>(1)
const picUrl = ref<string>('')
const refresh = ref<boolean>(false)


interface Query {
  source?: string
  id?: string
  page?: string
  picUrl?: string
  refresh?: 'true'
  fromName?: string
}

const verifyQueryParams = async function(this: any, to: { query: Query, path: string }, from: any, next: (route?: { path: string, query: Query }) => void) {
  let _source = to.query.source
  let _id = to.query.id
  let _page: string | undefined = to.query.page
  let _picUrl: string | undefined = to.query.picUrl
  let _refresh: 'true' | undefined = to.query.refresh

  if (_source == null || _id == null) {
    if (listDetailInfo.key) {
      _source = listDetailInfo.source
      _id = listDetailInfo.id
      _page = listDetailInfo.page.toString()
      _picUrl = listDetailInfo.info.img
    } else {
      setVisibleListDetail(false)
      next({ path: '/songList/list', query: {} })
      return
    }

    next({
      path: to.path,
      query: { ...to.query, source: _source, id: _id, page: _page, picUrl: _picUrl, refresh: _refresh },
    })
    return
  }
  next()
  setVisibleListDetail(true)
  source.value = _source as LX.OnlineSource
  id.value = _id
  window.lx.songListInfo.currentDetailId = _id
  page.value = _page ? parseInt(_page) : 1
  picUrl.value = _picUrl ?? ''
  refresh.value = _refresh ? _refresh == 'true' : false
  if (to.query.fromName) window.lx.songListInfo.fromName = to.query.fromName
}


export default {
  beforeRouteEnter: verifyQueryParams,
  beforeRouteUpdate: verifyQueryParams,
  setup() {
    const router = useRouter()
    const currentListId = computed(() => source.value && id.value ? `${source.value}__${id.value}` : '')

    const {
      listRef,
      listDetailInfo,
      getListData,
      handlePlayList,
    } = useList()


    const togglePage = (page: number) => {
      void getListData(source.value, id.value, page, refresh.value)
    }

    const handleBack = () => {
      setVisibleListDetail(false)
      if (window.lx.songListInfo.fromName) void router.replace({ name: window.lx.songListInfo.fromName })
      else router.back()
    }

    useKeyBack(handleBack)

    watch([source, id, page, refresh], async([_source, _id, _page, _refresh]) => {
      if (!_source || !_id) return router.replace({ path: '/songList/list' })
      // console.log(_source, _id, _page, _refresh, picUrl.value)
      // source.value = _source
      // id.value = _id
      // refresh.value = _refresh
      // page.value = _page ?? 1
      void getListData(_source, _id, _page, _refresh)
    }, {
      immediate: true,
    })

    return {
      source,
      id,
      page,
      picUrl,
      listDetailInfo,
      currentListId,
      listRef,
      togglePage,
      addSongListDetail,
      playSongListDetail,
      handlePlayList,
      handleBack,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-flow: column nowrap;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.songListHeader {
  position: relative;
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: stretch;
  gap: 20px;
  padding: 22px;
  border-radius: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(198, 47, 47, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.998), rgba(246, 246, 248, 0.992));
  border: 1px solid rgba(230, 230, 234, 0.96);
  box-shadow: 0 20px 42px rgba(15, 23, 42, 0.06);

  &::before {
    .mixin-after();
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0));
  }
}

.coverShell {
  flex: none;
  width: 132px;
  display: flex;
  align-items: center;
}
.songListHeaderLeft {
  flex: none;
  width: 100%;
  height: 132px;
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  background-position: center;
  background-size: cover;
  opacity: 1;
  box-shadow:
    0 18px 34px rgba(15, 23, 42, 0.16),
    0 12px 28px rgba(198, 47, 47, 0.12);

  &::before {
    .mixin-after();
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0));
  }

  &::after {
    .mixin-after();
    left: 0;
    bottom: 0;
    width: 100%;
    height: 54%;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0), rgba(15, 23, 42, 0.42));
  }
}
.playNum {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 1;
  max-width: calc(100% - 20px);
  padding: 6px 10px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(14px);
  color: #fff;
  font-size: var(--ui-font-meta);
  font-weight: 600;
  text-align: center;
  .mixin-ellipsis-1();
}

.songListHeaderMiddle {
  flex: auto;
  min-height: 0;
  padding: 4px 0;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  gap: 12px;

  .metaRow {
    display: flex;
    flex-flow: row wrap;
    gap: 8px;
    align-items: center;
  }

  .typeTag,
  .metaTag {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 13px;
    border-radius: 999px;
    font-size: var(--ui-font-meta);
    font-weight: 600;
    line-height: 1;
  }

  .typeTag {
    color: #fff;
    background: linear-gradient(180deg, rgb(214, 68, 68), rgb(186, 39, 39));
    box-shadow: 0 10px 20px rgba(198, 47, 47, 0.18);
  }

  .metaTag {
    color: var(--ui-text-secondary);
    background: linear-gradient(180deg, rgba(198, 47, 47, 0.08), rgba(198, 47, 47, 0.05));
    border: 1px solid rgba(198, 47, 47, 0.1);
  }

  h3 {
    .mixin-ellipsis-1();
    font-size: clamp(22px, 2vw, 30px);
    line-height: 1.18;
    color: var(--ui-text-primary);
    font-weight: 800;
    letter-spacing: 0.015em;
  }
  p {
    .mixin-ellipsis(3);
    font-size: var(--ui-font-caption);
    line-height: var(--ui-line-body);
    color: var(--ui-text-secondary);
    max-width: 760px;
  }
}
.songListHeaderRight {
  flex: none;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  gap: 10px;
  width: 208px;
  padding: 10px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(248, 248, 250, 0.94));
  border: 1px solid rgba(231, 231, 235, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.68);

  .headerRightBtn {
    width: 100%;
    min-height: 44px;
    font-weight: 600;
  }

  .primaryBtn {
    color: #fff;
    border-color: rgba(198, 47, 47, 0.3);
    background: linear-gradient(180deg, rgb(214, 68, 68), rgb(186, 39, 39)) !important;
    box-shadow: 0 14px 24px rgba(198, 47, 47, 0.2);

    &:hover {
      color: #fff;
      box-shadow: 0 16px 28px rgba(198, 47, 47, 0.24);
    }
  }
}

.list {
  position: relative;
  width: 100%;
  min-height: 0;
  flex: auto;
  height: 100%;
}

@media (max-width: 1120px) {
  .songListHeader {
    flex-wrap: wrap;
  }

  .songListHeaderRight {
    width: 100%;
    padding: 0;
    background: transparent;
    border: 0;
    box-shadow: none;
    flex-direction: row;
    flex-wrap: wrap;

    .headerRightBtn {
      width: auto;
      min-width: 126px;
      flex: 1 1 0;
    }
  }
}

@media (max-width: 780px) {
  .songListHeader {
    gap: 14px;
    padding: 16px;
  }

  .coverShell {
    width: 96px;
  }

  .songListHeaderLeft {
    height: 96px;
    border-radius: 20px;
  }

  .songListHeaderMiddle {
    h3 {
      font-size: 20px;
    }
  }
}
</style>
