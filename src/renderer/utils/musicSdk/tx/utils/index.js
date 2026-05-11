
import { httpFetch } from '../../../request'
import { requestMsg } from '../../../message'
import { zzcSign } from './crypto'

export const signRequest = (data) => {
  let requestObj = null
  let rejectPromise = null
  let isCancelled = false
  const task = {
    cancelHttp() {
      if (isCancelled) return
      isCancelled = true
      if (requestObj?.cancelHttp) {
        requestObj.cancelHttp()
        return
      }
      if (rejectPromise) {
        rejectPromise(new Error(requestMsg.cancelRequest))
        rejectPromise = null
      }
    },
    promise: new Promise((resolve, reject) => {
      rejectPromise = reject
      zzcSign(JSON.stringify(data)).then((sign) => {
        if (isCancelled) {
          reject(new Error(requestMsg.cancelRequest))
          return
        }
        requestObj = httpFetch(`https://u.y.qq.com/cgi-bin/musics.fcg?sign=${sign}`, {
          method: 'post',
          headers: {
            'User-Agent': 'QQMusic 14090508(android 12)',
          },
          body: data,
        })
        if (isCancelled) {
          requestObj.cancelHttp()
          return
        }
        requestObj.promise.then((result) => {
          rejectPromise = null
          resolve(result)
        }).catch((error) => {
          rejectPromise = null
          reject(error)
        })
      }).catch((error) => {
        rejectPromise = null
        reject(error)
      })
    }),
  }
  return task
}
