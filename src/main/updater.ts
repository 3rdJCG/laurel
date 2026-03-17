import { autoUpdater } from 'electron-updater'
import { dialog } from 'electron'
import type { BrowserWindow } from 'electron'
import { getSettings } from './storage/settings'

export type UpdateStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'up-to-date' }
  | { type: 'downloading'; percent: number }
  | { type: 'ready'; version: string }
  | { type: 'error'; message: string }

const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours

let _window: BrowserWindow | null = null

function sendStatus(status: UpdateStatus): void {
  _window?.webContents.send('updater:status', status)
}

export function setupAutoUpdater(window: BrowserWindow): void {
  _window = window
  const settings = getSettings()
  autoUpdater.channel = settings.updateChannel ?? 'latest'
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ type: 'checking' })
  })

  autoUpdater.on('update-not-available', () => {
    sendStatus({ type: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (info) => {
    sendStatus({ type: 'downloading', percent: Math.round(info.percent) })
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
    sendStatus({ type: 'error', message: err.message })
  })

  autoUpdater.on('update-downloaded', async (info) => {
    sendStatus({ type: 'ready', version: info.version })
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

export function checkForUpdatesManually(): void {
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] manual checkForUpdates failed:', err)
    sendStatus({ type: 'error', message: err.message })
  })
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
