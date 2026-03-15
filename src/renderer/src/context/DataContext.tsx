import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ulid } from 'ulid'
import type { Project, Task, Genre } from '../types'
import type { ProjectFile, LoadAllResult } from '../../../main/storage/projectStore'

export type LoadError = { filePath: string; message: string }

type DataContextValue = {
  projects: Project[]
  tasksByProject: Record<string, Task[]>
  isLoading: boolean
  error: string | null
  loadErrors: LoadError[]
  genres: Genre[]
  createProject: (name: string) => Promise<void>
  updateProject: (projectId: string, changes: Partial<Project>) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  createTask: (projectId: string, parentId: string | null, title: string, inheritFrom?: Task | null) => Promise<Task>
  updateTask: (projectId: string, taskId: string, changes: Partial<Task>) => Promise<void>
  deleteTask: (projectId: string, taskId: string) => Promise<void>
  saveProjectData: (projectId: string) => Promise<void>
  dismissLoadErrors: () => void
  addGenre: (name: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadErrors, setLoadErrors] = useState<LoadError[]>([])
  const [genres, setGenres] = useState<Genre[]>([])

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = (await window.api.invoke('data:load-all')) as LoadAllResult
      const projectList: Project[] = []
      const tasksMap: Record<string, Task[]> = {}
      for (const pf of result.projects) {
        projectList.push(pf.project)
        tasksMap[pf.project.id] = pf.tasks
      }
      // Sort projects by id (ULID = chronological)
      projectList.sort((a, b) => a.id.localeCompare(b.id))
      setProjects(projectList)
      setTasksByProject(tasksMap)
      if (result.errors && result.errors.length > 0) {
        setLoadErrors(result.errors)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    window.api.invoke('settings:get').then((s) => {
      const settings = s as { genres?: Genre[] }
      setGenres(settings.genres ?? [])
    })
  }, [])

  const addGenre = useCallback(async (name: string) => {
    const newGenre: Genre = { name, color: '#6b7280' }
    setGenres((prev) => {
      const updated = [...prev, newGenre]
      window.api.invoke('settings:genres-set', updated)
      return updated
    })
  }, [])

  useEffect(() => {
    loadAll()

    // Listen for external file changes
    window.api.on('data:project-changed', (data: unknown) => {
      const pf = data as ProjectFile
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === pf.project.id)
        if (idx === -1) return [...prev, pf.project].sort((a, b) => a.id.localeCompare(b.id))
        const updated = [...prev]
        updated[idx] = pf.project
        return updated
      })
      setTasksByProject((prev) => ({ ...prev, [pf.project.id]: pf.tasks }))
    })

    window.api.on('data:project-added', (data: unknown) => {
      const pf = data as ProjectFile
      setProjects((prev) => {
        if (prev.find((p) => p.id === pf.project.id)) return prev
        return [...prev, pf.project].sort((a, b) => a.id.localeCompare(b.id))
      })
      setTasksByProject((prev) => ({ ...prev, [pf.project.id]: pf.tasks }))
    })

    window.api.on('data:project-removed', (projectId: unknown) => {
      const id = projectId as string
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setTasksByProject((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    })

    window.api.on('data:reload', () => {
      loadAll()
    })
  }, [loadAll])

  const saveProjectData = useCallback(
    async (projectId: string) => {
      const project = projects.find((p) => p.id === projectId)
      if (!project) return
      const tasks = tasksByProject[projectId] ?? []
      const data: ProjectFile = { version: 1, project, tasks }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean
        error?: { code: string; message: string }
      }
      if (!result.ok) {
        throw new Error(result.error?.message ?? 'Save failed')
      }
    },
    [projects, tasksByProject]
  )

  const createProject = useCallback(async (name: string) => {
    const project: Project = { id: ulid(), name, createdAt: new Date().toISOString() }
    setProjects((prev) => [...prev, project].sort((a, b) => a.id.localeCompare(b.id)))
    setTasksByProject((prev) => ({ ...prev, [project.id]: [] }))
    const data: ProjectFile = { version: 1, project, tasks: [] }
    const result = (await window.api.invoke('data:save-project', { projectId: project.id, data })) as {
      ok: boolean
      error?: { code: string; message: string }
    }
    if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')
  }, [])

  const updateProject = useCallback(
    async (projectId: string, changes: Partial<Project>) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, ...changes } : p))
      )
      // saveProjectData needs latest state - use functional update trick via callback
      setProjects((prev) => {
        const project = prev.find((p) => p.id === projectId)
        if (!project) return prev
        setTasksByProject((tasks) => {
          const data: ProjectFile = {
            version: 1,
            project,
            tasks: tasks[projectId] ?? []
          }
          window.api.invoke('data:save-project', { projectId, data })
          return tasks
        })
        return prev
      })
    },
    []
  )

  const deleteProject = useCallback(async (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    setTasksByProject((prev) => {
      const next = { ...prev }
      delete next[projectId]
      return next
    })
    const result = (await window.api.invoke('data:delete-project', { projectId })) as {
      ok: boolean
      error?: { code: string; message: string }
    }
    if (!result.ok) throw new Error(result.error?.message ?? 'Delete failed')
  }, [])

  const createTask = useCallback(
    async (projectId: string, parentId: string | null, title: string, inheritFrom?: Task | null): Promise<Task> => {
      const existing = tasksByProject[projectId] ?? []
      const siblings = existing.filter((t) => t.parentId === parentId)
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((t) => t.order)) : -1
      const task: Task = {
        id: ulid(),
        projectId,
        parentId,
        title,
        status: 'todo',
        genre: parentId !== null ? null : (inheritFrom?.genre ?? null),
        tags: inheritFrom?.tags ?? [],
        createdAt: new Date().toISOString(),
        occurredAt: new Date().toISOString().slice(0, 10),
        dueAt: null,
        order: maxOrder + 1
      }
      const newTasks = [...existing, task]
      setTasksByProject((prev) => ({ ...prev, [projectId]: newTasks }))
      const project = projects.find((p) => p.id === projectId)!
      const data: ProjectFile = { version: 1, project, tasks: newTasks }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean
        error?: { code: string; message: string }
      }
      if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')
      return task
    },
    [projects, tasksByProject]
  )

  const updateTask = useCallback(
    async (projectId: string, taskId: string, changes: Partial<Task>) => {
      const existing = tasksByProject[projectId] ?? []
      const newTasks = existing.map((t) => (t.id === taskId ? { ...t, ...changes } : t))
      setTasksByProject((prev) => ({ ...prev, [projectId]: newTasks }))
      const project = projects.find((p) => p.id === projectId)!
      const data: ProjectFile = { version: 1, project, tasks: newTasks }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean
        error?: { code: string; message: string }
      }
      if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')
    },
    [projects, tasksByProject]
  )

  const deleteTask = useCallback(
    async (projectId: string, taskId: string) => {
      const existing = tasksByProject[projectId] ?? []
      // Cascade delete: remove task and all descendants
      const toDelete = new Set<string>()
      const collect = (id: string): void => {
        toDelete.add(id)
        existing.filter((t) => t.parentId === id).forEach((t) => collect(t.id))
      }
      collect(taskId)
      const newTasks = existing.filter((t) => !toDelete.has(t.id))
      setTasksByProject((prev) => ({ ...prev, [projectId]: newTasks }))
      const project = projects.find((p) => p.id === projectId)!
      const data: ProjectFile = { version: 1, project, tasks: newTasks }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean
        error?: { code: string; message: string }
      }
      if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')
    },
    [projects, tasksByProject]
  )

  const dismissLoadErrors = useCallback(() => setLoadErrors([]), [])

  return (
    <DataContext.Provider
      value={{
        projects,
        tasksByProject,
        isLoading,
        error,
        loadErrors,
        genres,
        createProject,
        updateProject,
        deleteProject,
        createTask,
        updateTask,
        deleteTask,
        saveProjectData,
        dismissLoadErrors,
        addGenre
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
