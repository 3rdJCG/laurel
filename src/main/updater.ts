import { autoUpdater } from 'electron-updater'
import { dialog } from 'electron'
import type { BrowserWindow } from 'electron'
import { getSettings } from './storage/settings'

const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours

export function setupAutoUpdater(window: BrowserWindow): void {
  const settings = getSettings()
  autoUpdater.channel = settings.updateChannel ?? 'latest'
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
  })

  autoUpdater.on('update-downloaded', async () => {
    const { response } = await dialog.showMessageBox(window, {
      type: 'info',
      buttons: ['今すぐ再起動', '後で'],
      defaultId: 0,
      cancelId: 1,
      title: 'アップデートの準備完了',
      message: '新しいバージョンがダウンロードされました。今すぐ再起動してインストールしますか？'
    })
    if (response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  // Check on startup
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] checkForUpdates failed:', err)
  })

  // Check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] checkForUpdates failed:', err)
    })
  }, UPDATE_CHECK_INTERVAL)
}

export function setUpdaterChannel(channel: 'latest' | 'beta'): void {
  autoUpdater.channel = channel
}
