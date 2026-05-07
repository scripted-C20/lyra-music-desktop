import { app } from 'electron'
import { openDevTools } from './utils'

const openWindowDevtools = (win: Electron.BrowserWindow) => {
  openDevTools(win.webContents)
}

app.on('ready', () => {
  global.lx.event_app.on('main_window_created', (win) => {
    openWindowDevtools(win)
  })
  global.lx.event_app.on('desktop_lyric_window_created', (win) => {
    openWindowDevtools(win)
  })
})

require('./index')
