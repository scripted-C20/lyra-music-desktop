import { ref } from '@common/utils/vueTools'
// import { useI18n } from '@renderer/plugins/i18n'
// import { } from '@renderer/store/search/state'
import { getAndSetListDetail } from '@renderer/store/songList/action'
import { listDetailInfo } from '@renderer/store/songList/state'
import { playSongListDetail } from './action'

export default () => {
  const listRef = ref<any>(null)

  const getListData = async(source: LX.OnlineSource, id: string, page: number, refresh: boolean) => {
    try {
      await getAndSetListDetail(id, source, page, refresh)
    } catch (error) {
      console.log(error)
    } finally {
      setTimeout(() => {
        if (listRef.value) listRef.value.scrollToTop()
      })
    }
  }

  const handlePlayList = (index: number) => {
    void playSongListDetail(listDetailInfo.id, listDetailInfo.source, listDetailInfo.list, index)
  }


  return {
    listRef,
    listDetailInfo,
    getListData,
    handlePlayList,
  }
}
