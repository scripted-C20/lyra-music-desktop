import { log } from './utils'

const ignoreErrorMessage = [
  'Possible side-effect in debug-evaluate',
  'Unexpected end of input',
]

process.on('uncaughtException', err => {
  if (ignoreErrorMessage.includes(err?.message)) return
  if (process.env.NODE_ENV === 'development') {
    console.error('An uncaught error occurred!')
    console.error(err)
  }
  log.error(err)
})
process.on('unhandledRejection', (reason, p) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled Rejection at: Promise ', p)
    console.error(' reason: ', reason)
  }
  log.error(reason)
})
