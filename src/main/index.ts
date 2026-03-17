import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadWindowState, saveWindowState } from './windowState'
import { setupCsp } from './csp'
import { getSettings, saveSettings, type Genre } from './storage/settings'
import { setupAutoUpdater, setUpdaterChannel } from './updater'
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
import * as path from 'path'
import { ulid } from 'ulid'
import type { Comment, Issue, IssueComment } from '../renderer/src/types'

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
        // Preserve existing comments when not provided
        if (!data.comments) {
          const existing = loadOne(path.join(dataDir, `${projectId}.json`))
          data.comments = existing?.comments ?? []
        }
        // Preserve existing issues when not provided
        if (!data.issues) {
          const existing = loadOne(path.join(dataDir, `${projectId}.json`))
          data.issues = existing?.issues ?? []
        }
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

  ipcMain.handle('settings:genres-set', (_event, genres: Genre[]) => {
    const current = getSettings()
    saveSettings({ ...current, genres })
    return { ok: true }
  })

  ipcMain.handle(
    'settings:user-info-set',
    (_event, { name, mailAddress }: { name: string; mailAddress: string }) => {
      const current = getSettings()
      saveSettings({ ...current, name, mailAddress })
      return { ok: true }
    }
  )

  ipcMain.handle('settings:update-channel-set', (_event, channel: 'latest' | 'beta') => {
    const current = getSettings()
    saveSettings({ ...current, updateChannel: channel })
    setUpdaterChannel(channel)
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

  ipcMain.handle(
    'comments:list',
    (_event, { projectId, taskId }: { projectId: string; taskId: string }): Comment[] => {
      const { dataDir } = getSettings()
      const filePath = path.join(dataDir, `${projectId}.json`)
      const data = loadOne(filePath)
      if (!data) return []
      return (data.comments ?? []).filter((c) => c.taskId === taskId)
    }
  )

  ipcMain.handle(
    'comments:add',
    (
      _event,
      {
        projectId,
        comment
      }: { projectId: string; comment: Omit<Comment, 'id' | 'createdAt'> }
    ): Comment => {
      const { dataDir } = getSettings()
      const filePath = path.join(dataDir, `${projectId}.json`)
      const data = loadOne(filePath)
      if (!data) throw new Error('Project not found')
      const newComment: Comment = {
        ...comment,
        id: ulid(),
        createdAt: new Date().toISOString()
      }
      data.comments = [...(data.comments ?? []), newComment]
      saveProject(dataDir, projectId, data, selfWriting)
      return newComment
    }
  )

  ipcMain.handle(
    'issues:list',
    (_event, { projectId, taskId }: { projectId: string; taskId: string }): Issue[] => {
      const { dataDir } = getSettings()
      const filePath = path.join(dataDir, `${projectId}.json`)
      const data = loadOne(filePath)
      if (!data) return []
      return (data.issues ?? []).filter((i) => i.taskId === taskId)
    }
  )

  ipcMain.handle(
    'issues:create',
    (
      _event,
      {
        projectId,
        taskId,
        title,
        body,
        labels
      }: { projectId: string; taskId: string; title: string; body: string; labels: string[] }
    ): Issue => {
      const { dataDir, name, mailAddress } = getSettings()
      const filePath = path.join(dataDir, `${projectId}.json`)
      const data = loadOne(filePath)
      if (!data) throw new Error('Project not found')
      const existingIssues = data.issues ?? []
      const maxNumber = existingIssues.reduce((max, i) => Math.max(max, i.number), 0)
      const newIssue: Issue = {
        id: ulid(),
        projectId,
        taskId,
        number: maxNumber + 1,
        title,
        body,
        status: 'open',
        labels,
        createdAt: new Date().toISOString(),
        closedAt: null,
        authorName: name ?? '',
        authorEmail: mailAddress ?? '',
        comments: []
      }
      data.issues = [...existingIssues, newIssue]
      saveProject(dataDir, projectId, data, selfWriting)
      return newIssue
    }
  )

  ipcMain.handle(
    'issues:update',
    (
      _event,
      {
        projectId,
        issueId,
        changes
      }: { projectId: string; issueId: string; changes: Partial<Issue> }
    ): Issue => {
      const { dataDir } = getSettings()
      const filePath = path.join(dataDir, `${projectId}.json`)
      const data = loadOne(filePath)
      if (!data) throw new Error('Project not found')
      const issues = data.issues ?? []
      const idx = issues.findIndex((i) => i.id === issueId)
      if (idx === -1) throw new Error('Issue not found')
      const updated: Issue = { ...issues[idx], ...changes }
      data.issues = [...issues.slice(0, idx), updated, ...issues.slice(idx + 1)]
      saveProject(dataDir, projectId, data, selfWriting)
      return updated
    }
  )

  ipcMain.handle(
    'issues:add-comment',
    (
      _event,
      { projectId, issueId, body }: { projectId: string; issueId: string; body: string }
    ): IssueComment => {
      const { dataDir, name, mailAddress } = getSettings()
      const filePath = path.join(dataDir, `${projectId}.json`)
      const data = loadOne(filePath)
      if (!data) throw new Error('Project not found')
      const issues = data.issues ?? []
      const idx = issues.findIndex((i) => i.id === issueId)
      if (idx === -1) throw new Error('Issue not found')
      const newComment: IssueComment = {
        id: ulid(),
        issueId,
        authorName: name ?? '',
        authorEmail: mailAddress ?? '',
        body,
        createdAt: new Date().toISOString()
      }
      const updatedIssue: Issue = {
        ...issues[idx],
        comments: [...issues[idx].comments, newComment]
      }
      data.issues = [...issues.slice(0, idx), updatedIssue, ...issues.slice(idx + 1)]
      saveProject(dataDir, projectId, data, selfWriting)
      return newComment
    }
  )
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupCsp(is.dev)
  setupIpc()
  createWindow()
  if (!is.dev) {
    setupAutoUpdater(mainWindow!)
  }

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
