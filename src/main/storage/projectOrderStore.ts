import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const storeDir = path.join(app.getPath('userData'), 'laurel')
const orderPath = path.join(storeDir, 'project-order.json')

function read(): string[] {
  try {
    if (fs.existsSync(orderPath)) {
      const raw = fs.readFileSync(orderPath, 'utf-8')
      const parsed = JSON.parse(raw) as { ids?: string[] }
      return parsed.ids ?? []
    }
  } catch {
    // fall through
  }
  return []
}

export function getProjectOrder(): string[] {
  return read()
}

export function saveProjectOrder(ids: string[]): void {
  fs.mkdirSync(storeDir, { recursive: true })
  fs.writeFileSync(orderPath, JSON.stringify({ ids }, null, 2))
}
