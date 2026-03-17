import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export type Genre = {
  name: string
  color: string
}

export type AppSettings = {
  dataDir: string
  genres: Genre[]
  name: string
  mailAddress: string
}

const DEFAULT_COLOR = '#6b7280'

const settingsDir = path.join(app.getPath('userData'), 'laurel')
const settingsPath = path.join(settingsDir, 'settings.json')

function defaultDataDir(): string {
  return path.join(app.getPath('documents'), 'laurel')
}

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8')
      const parsed = JSON.parse(raw) as { dataDir?: string; genres?: (Genre | string)[]; name?: string; mailAddress?: string }
      return {
        dataDir: parsed.dataDir ?? defaultDataDir(),
        genres: (parsed.genres ?? []).map((g) =>
          typeof g === 'string' ? { name: g, color: DEFAULT_COLOR } : g
        ),
        name: parsed.name ?? '',
        mailAddress: parsed.mailAddress ?? ''
      }
    }
  } catch {
    // fall through to default
  }
  return { dataDir: defaultDataDir(), genres: [], name: '', mailAddress: '' }
}

export function saveSettings(settings: AppSettings): void {
  fs.mkdirSync(settingsDir, { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
}
