import * as fs from 'fs'
import * as path from 'path'
import type { Project, Task, Comment, Issue } from '../../renderer/src/types'

export type ProjectFile = {
  version: number
  project: Project
  tasks: Task[]
  comments?: Comment[]
  issues?: Issue[]
}

export type LoadAllResult = {
  projects: ProjectFile[]
  errors: Array<{ filePath: string; message: string }>
}

export function ensureDataDir(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true })
}

export function loadAll(dataDir: string): LoadAllResult {
  ensureDataDir(dataDir)
  const result: LoadAllResult = { projects: [], errors: [] }

  let files: string[]
  try {
    files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'))
  } catch (err) {
    result.errors.push({ filePath: dataDir, message: String(err) })
    return result
  }

  for (const file of files) {
    const filePath = path.join(dataDir, file)
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as ProjectFile
      if (!parsed.project || !parsed.project.id) {
        result.errors.push({ filePath, message: 'Invalid project file structure' })
        continue
      }
      // Version check: only support version 1
      if (parsed.version !== 1) {
        result.errors.push({ filePath, message: `Unsupported file version: ${parsed.version}` })
        continue
      }
      // Migrate: ensure order field exists on all tasks
      parsed.tasks = (parsed.tasks ?? []).map((t, i) => ({
        ...t,
        order: t.order ?? i,
        description: t.description ?? null
      }))
      parsed.comments = parsed.comments ?? []
      parsed.issues = parsed.issues ?? []
      result.projects.push(parsed)
    } catch (err) {
      result.errors.push({ filePath, message: String(err) })
    }
  }

  return result
}

export function loadOne(filePath: string): ProjectFile | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as ProjectFile
    if (!parsed.project || !parsed.project.id) return null
    parsed.tasks = (parsed.tasks ?? []).map((t, i) => ({
      ...t,
      order: t.order ?? i
    }))
    parsed.comments = parsed.comments ?? []
    parsed.issues = parsed.issues ?? []
    return parsed
  } catch {
    return null
  }
}

export function saveProject(
  dataDir: string,
  projectId: string,
  data: ProjectFile,
  selfWriting: Set<string>
): void {
  ensureDataDir(dataDir)
  const filePath = path.join(dataDir, `${projectId}.json`)
  selfWriting.add(filePath)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  setTimeout(() => selfWriting.delete(filePath), 1500)
}

export function deleteProject(
  dataDir: string,
  projectId: string,
  selfWriting: Set<string>
): void {
  const filePath = path.join(dataDir, `${projectId}.json`)
  selfWriting.add(filePath)
  try {
    fs.unlinkSync(filePath)
  } catch {
    // file may not exist
  }
  setTimeout(() => selfWriting.delete(filePath), 1500)
}

export function copyProjects(fromDir: string, toDir: string): void {
  ensureDataDir(toDir)
  const files = fs.readdirSync(fromDir).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    const src = path.join(fromDir, file)
    const dest = path.join(toDir, file)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest)
    }
  }
}
