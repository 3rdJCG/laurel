import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export type AppSettings = {
  dataDir: string
  genres: string[]
}

const settingsDir = path.join(app.getPath('userData'), 'laurel')
const settingsPath = path.join(settingsDir, 'settings.json')

function defaultDataDir(): string {
  return path.join(app.getPath('documents'), 'laurel')
}

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return {
        dataDir: parsed.dataDir ?? defaultDataDir(),
        genres: parsed.genres ?? []
      }
    }
  } catch {
    // fall through to default
  }
  return { dataDir: defaultDataDir(), genres: [] }
}

export function saveSettings(settings: AppSettings): void {
  fs.mkdirSync(settingsDir, { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
}
