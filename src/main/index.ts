import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadWindowState, saveWindowState } from './windowState'
import { setupCsp } from './csp'
import { getSettings, saveSettings } from './storage/settings'
import {
  loadAll,
  loadOne,
  saveProject,
  deleteProject,
  copyProjects,
  type ProjectFile
} from './storage/projectStore'
import { startWatcher, stopWatcher } from './storage/watcher'
import * as fs from 'fs'

let mainWindow: BrowserWindow | null = null
const selfWriting = new Set<string>()

function createWindow(): void {
  const windowState = loadWindowState()
  mainWindow = new BrowserWindow({
    ...windowState,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('close', () => {
    saveWindowState(mainWindow!)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    if (is.dev) {
      mainWindow!.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function initWatcher(dataDir: string): void {
  startWatcher(dataDir, selfWriting, {
    onChanged: (filePath) => {
      const data = loadOne(filePath)
      if (data && mainWindow) {
        mainWindow.webContents.send('data:project-changed', data)
      }
    },
    onAdded: (filePath) => {
      const data = loadOne(filePath)
      if (data && mainWindow) {
        mainWindow.webContents.send('data:project-added', data)
      }
    },
    onRemoved: (filePath) => {
      const projectId = basename(filePath, '.json')
      if (mainWindow) {
        mainWindow.webContents.send('data:project-removed', projectId)
      }
    }
  })
}

function setupIpc(): void {
  ipcMain.handle('data:load-all', () => {
    const { dataDir } = getSettings()
    return loadAll(dataDir)
  })

  ipcMain.handle(
    'data:save-project',
    (_event, { projectId, data }: { projectId: string; data: ProjectFile }) => {
      const { dataDir } = getSettings()
      try {
        saveProject(dataDir, projectId, data, selfWriting)
        return { ok: true }
      } catch (err) {
        return { ok: false, error: { code: 'SAVE_FAILED', message: String(err) } }
      }
    }
  )

  ipcMain.handle('data:delete-project', (_event, { projectId }: { projectId: string }) => {
    const { dataDir } = getSettings()
    try {
      deleteProject(dataDir, projectId, selfWriting)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: { code: 'DELETE_FAILED', message: String(err) } }
    }
  })

  ipcMain.handle('settings:get', () => {
    return getSettings()
  })

  ipcMain.handle('settings:set', async (_event, newSettings: { dataDir: string }) => {
    const current = getSettings()
    const newDataDir = newSettings.dataDir

    // Validate access
    try {
      fs.mkdirSync(newDataDir, { recursive: true })
      fs.accessSync(newDataDir, fs.constants.R_OK | fs.constants.W_OK)
    } catch (err) {
      return { ok: false, error: { code: 'ACCESS_DENIED', message: String(err) } }
    }

    // Stop old watcher
    stopWatcher()

    // Copy existing projects if new dir has none
    const hasExisting =
      fs.readdirSync(newDataDir).filter((f) => f.endsWith('.json')).length > 0
    if (!hasExisting) {
      try {
        copyProjects(current.dataDir, newDataDir)
      } catch {
        // non-fatal
      }
    }

    // Save settings (preserve existing genres)
    saveSettings({ ...current, dataDir: newDataDir })

    // Restart watcher on new dir
    initWatcher(newDataDir)

    // Notify renderer to reload data
    if (mainWindow) {
      mainWindow.webContents.send('data:reload')
    }

    return { ok: true }
  })

  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:show-item-in-folder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupCsp(is.dev)
  setupIpc()
  createWindow()

  const { dataDir } = getSettings()
  initWatcher(dataDir)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopWatcher()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
