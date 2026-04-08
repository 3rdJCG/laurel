import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const storeDir = path.join(app.getPath('userData'), 'laurel')
const processedPath = path.join(storeDir, 'forge-processed.json')

function readProcessed(): string[] {
  try {
    if (fs.existsSync(processedPath)) {
      const raw = fs.readFileSync(processedPath, 'utf-8')
      const parsed = JSON.parse(raw) as { ids?: string[] }
      return parsed.ids ?? []
    }
  } catch {
    // fall through
  }
  return []
}

export function getProcessedMailIds(): string[] {
  return readProcessed()
}

export function addProcessedMailId(id: string): void {
  const ids = readProcessed()
  if (!ids.includes(id)) {
    fs.mkdirSync(storeDir, { recursive: true })
    fs.writeFileSync(processedPath, JSON.stringify({ ids: [...ids, id] }, null, 2))
  }
}
