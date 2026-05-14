import { httpFetch } from '../../request'
import getSongId from './songId'

export default {
  getPicUrl(songId, tryNum = 0) {
    let requestObj = httpFetch(`http://music.migu.cn/v3/api/music/audioPlayer/getSongPic?songId=${songId}`, {
      headers: {
        Referer: 'http://music.migu.cn/v3/music/player/audio?from=migu',
      },
    })
    requestObj.promise = requestObj.promise.then(({ body }) => {
      if (body.returnCode !== '000000') {
        if (tryNum > 5) return Promise.reject(new Error('图片获取失败'))
        let tryRequestObj = this.getPicUrl(songId, ++tryNum)
        requestObj.cancelHttp = tryRequestObj.cancelHttp.bind(tryRequestObj)
        return tryRequestObj.promise
      }
      let url = body.largePic || body.mediumPic || body.smallPic
      if (!url) return Promise.reject(new Error('图片获取失败'))
      if (!/https?:/.test(url)) url = 'http:' + url
      return url
    })
    return requestObj
  },
  getPic(songInfo) {
    let requestObj = null
    return {
      cancelHttp() {
        requestObj?.cancelHttp?.()
      },
      promise: getSongId(songInfo).then(songId => {
        requestObj = this.getPicUrl(songId)
        return requestObj.promise
      }),
    }
  },
}
