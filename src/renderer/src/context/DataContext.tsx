import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { ulid } from 'ulid'
import type { Project, Task, Genre, Comment, Issue, IssueComment } from '../types'
import type { ProjectFile, LoadAllResult } from '../../../main/storage/projectStore'

export type LoadError = { filePath: string; message: string }

function applyOrder(projects: Project[], savedIds: string[]): Project[] {
  const map = new Map(projects.map((p) => [p.id, p]))
  const ordered: Project[] = []
  for (const id of savedIds) {
    if (map.has(id)) { ordered.push(map.get(id)!); map.delete(id) }
  }
  for (const p of map.values()) ordered.push(p)
  return ordered
}

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
  reorderProjects: (ids: string[]) => Promise<void>
  createTask: (projectId: string, parentId: string | null, title: string, inheritFrom?: Task | null, overrides?: Partial<Task>) => Promise<Task>
  duplicateTaskTree: (projectId: string, sourceTaskId: string, newParentId: string | null) => Promise<Task>
  duplicateTaskTreeBulk: (projectId: string, sourceTaskIds: string[], newParentId: string | null) => Promise<Task[]>
  createCheckpoint: (projectId: string, rootTaskId: string, title: string) => Promise<Task>
  moveTaskToCheckpoint: (projectId: string, taskId: string, targetCheckpointId: string) => Promise<void>
  moveTasksToCheckpointBulk: (projectId: string, taskIds: string[], targetCheckpointId: string) => Promise<void>
  updateTask: (projectId: string, taskId: string, changes: Partial<Task>) => Promise<void>
  deleteTask: (projectId: string, taskId: string) => Promise<void>
  deleteTasksBulk: (projectId: string, taskIds: string[]) => Promise<void>
  saveProjectData: (projectId: string) => Promise<void>
  dismissLoadErrors: () => void
  addGenre: (name: string) => Promise<void>
  updateGenres: (genres: Genre[]) => void
  listComments: (projectId: string, taskId: string) => Promise<Comment[]>
  addComment: (projectId: string, data: Omit<Comment, 'id' | 'createdAt' | 'authorName' | 'authorEmail'>) => Promise<Comment>
  listIssues: (projectId: string, taskId: string | null) => Promise<Issue[]>
  createIssue: (projectId: string, taskId: string | null, data: { title: string; body: string; labels: string[] }) => Promise<Issue>
  updateIssue: (projectId: string, issueId: string, changes: Partial<Issue>) => Promise<Issue>
  addIssueComment: (projectId: string, issueId: string, body: string) => Promise<IssueComment>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({})
  // 同レンダー内で updateTask を連続 await したとき、古い tasksByProject クロージャ
  // を読んで後続 update が前の update を上書きする問題を防ぐため、常に最新の
  // tasks を ref で保持する。setTasksByProject と同時に同期的に更新する。
  const tasksByProjectRef = useRef<Record<string, Task[]>>({})
  tasksByProjectRef.current = tasksByProject
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadErrors, setLoadErrors] = useState<LoadError[]>([])
  const [genres, setGenres] = useState<Genre[]>([])

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [result, savedOrder] = await Promise.all([
        window.api.invoke('data:load-all') as Promise<LoadAllResult>,
        window.api.invoke('projects:get-order') as Promise<string[]>
      ])
      const projectList: Project[] = []
      const tasksMap: Record<string, Task[]> = {}
      for (const pf of result.projects) {
        projectList.push(pf.project)
        tasksMap[pf.project.id] = pf.tasks
      }
      setProjects(applyOrder(projectList, savedOrder))
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

  const updateGenres = useCallback((genres: Genre[]) => {
    setGenres(genres)
  }, [])

  useEffect(() => {
    loadAll()

    // Listen for external file changes
    window.api.on('data:project-changed', (data: unknown) => {
      const pf = data as ProjectFile
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === pf.project.id)
        if (idx === -1) return [...prev, pf.project]
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
        return [...prev, pf.project]
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
    setProjects((prev) => [...prev, project])
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

  const reorderProjects = useCallback(async (ids: string[]) => {
    setProjects((prev) => applyOrder(prev, ids))
    await window.api.invoke('projects:set-order', { ids })
  }, [])

  const createTask = useCallback(
    async (projectId: string, parentId: string | null, title: string, inheritFrom?: Task | null, overrides?: Partial<Task>): Promise<Task> => {
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
        startAt: null,
        completedAt: null,
        order: maxOrder + 1,
        description: null,
        mailData: null,
        isCheckpoint: false,
        ...overrides
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
      // ref から最新 tasks を読む。これにより同レンダー内での連続 await 呼び出しでも
      // 直前の update が反映された状態を読める（前の update を上書きしない）。
      const existing = tasksByProjectRef.current[projectId] ?? []
      const newTasks = existing.map((t) => (t.id === taskId ? { ...t, ...changes } : t))
      // ref も同期的に更新して次の呼び出しに伝播
      tasksByProjectRef.current = { ...tasksByProjectRef.current, [projectId]: newTasks }
      setTasksByProject(tasksByProjectRef.current)
      const project = projects.find((p) => p.id === projectId)!
      const data: ProjectFile = { version: 1, project, tasks: newTasks }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean
        error?: { code: string; message: string }
      }
      if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')
    },
    [projects]
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

  const duplicateTaskTree = useCallback(
    async (projectId: string, sourceTaskId: string, newParentId: string | null): Promise<Task> => {
      const existing = tasksByProject[projectId] ?? []

      const collect = (id: string): Task[] => {
        const task = existing.find((t) => t.id === id)
        if (!task) return []
        const children = existing.filter((t) => t.parentId === id)
        return [task, ...children.flatMap((c) => collect(c.id))]
      }
      const subtree = collect(sourceTaskId)

      const idMap = new Map<string, string>()
      for (const t of subtree) idMap.set(t.id, ulid())

      const siblings = existing.filter((t) => t.parentId === newParentId)
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((t) => t.order)) : -1

      const now = new Date().toISOString()
      const newTasks: Task[] = subtree.map((t) => ({
        ...t,
        id: idMap.get(t.id)!,
        parentId: t.id === sourceTaskId ? newParentId : idMap.get(t.parentId!)!,
        createdAt: now,
        order: t.id === sourceTaskId ? maxOrder + 1 : t.order,
      }))

      const allTasks = [...existing, ...newTasks]
      setTasksByProject((prev) => ({ ...prev, [projectId]: allTasks }))

      const project = projects.find((p) => p.id === projectId)!
      const data: ProjectFile = { version: 1, project, tasks: allTasks }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean
        error?: { code: string; message: string }
      }
      if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')

      return newTasks[0]
    },
    [projects, tasksByProject]
  )

  const duplicateTaskTreeBulk = useCallback(
    async (projectId: string, sourceTaskIds: string[], newParentId: string | null): Promise<Task[]> => {
      let working = tasksByProject[projectId] ?? []
      const results: Task[] = []
      const now = new Date().toISOString()
      for (const sourceTaskId of sourceTaskIds) {
        const collect = (id: string): Task[] => {
          const task = working.find((t) => t.id === id)
          if (!task) return []
          return [task, ...working.filter((t) => t.parentId === id).flatMap((c) => collect(c.id))]
        }
        const subtree = collect(sourceTaskId)
        if (subtree.length === 0) continue
        const idMap = new Map<string, string>()
        for (const t of subtree) idMap.set(t.id, ulid())
        const siblings = working.filter((t) => t.parentId === newParentId)
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((t) => t.order)) : -1
        const newTasks: Task[] = subtree.map((t) => ({
          ...t,
          id: idMap.get(t.id)!,
          parentId: t.id === sourceTaskId ? newParentId : idMap.get(t.parentId!)!,
          createdAt: now,
          order: t.id === sourceTaskId ? maxOrder + 1 : t.order,
        }))
        working = [...working, ...newTasks]
        results.push(newTasks[0])
      }
      setTasksByProject((prev) => ({ ...prev, [projectId]: working }))
      const project = projects.find((p) => p.id === projectId)!
      const data: ProjectFile = { version: 1, project, tasks: working }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean; error?: { code: string; message: string }
      }
      if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')
      return results
    },
    [projects, tasksByProject]
  )

  const createCheckpoint = useCallback(
    async (projectId: string, rootTaskId: string, title: string): Promise<Task> => {
      const existing = tasksByProject[projectId] ?? []
      const existingCPs = existing.filter((t) => t.parentId === rootTaskId && t.isCheckpoint)
      const isFirstCP = existingCPs.length === 0

      const newCP: Task = {
        id: ulid(),
        projectId,
        parentId: rootTaskId,
        title,
        status: 'todo',
        genre: null,
        tags: [],
        createdAt: new Date().toISOString(),
        occurredAt: new Date().toISOString().slice(0, 10),
        dueAt: null,
        startAt: null,
        completedAt: null,
        order: existingCPs.length,
        description: null,
        mailData: null,
        isCheckpoint: true
      }

      let newTasks: Task[]
      if (isFirstCP) {
        const directSubtasks = existing.filter((t) => t.parentId === rootTaskId && !t.isCheckpoint)
        const movedSubtasks = directSubtasks.map((t) => ({ ...t, parentId: newCP.id }))
        const unchanged = existing.filter((t) => t.parentId !== rootTaskId || t.isCheckpoint)
        newTasks = [...unchanged, newCP, ...movedSubtasks]
      } else {
        newTasks = [...existing, newCP]
      }

      setTasksByProject((prev) => ({ ...prev, [projectId]: newTasks }))
      const project = projects.find((p) => p.id === projectId)!
      const data: ProjectFile = { version: 1, project, tasks: newTasks }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean
        error?: { code: string; message: string }
      }
      if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')
      return newCP
    },
    [projects, tasksByProject]
  )

  const moveTaskToCheckpoint = useCallback(
    async (projectId: string, taskId: string, targetCheckpointId: string): Promise<void> => {
      const existing = tasksByProject[projectId] ?? []
      const targetChildren = existing.filter((t) => t.parentId === targetCheckpointId)
      const newOrder = targetChildren.length
      const newTasks = existing.map((t) =>
        t.id === taskId ? { ...t, parentId: targetCheckpointId, order: newOrder } : t
      )
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

  const moveTasksToCheckpointBulk = useCallback(
    async (projectId: string, taskIds: string[], targetCheckpointId: string): Promise<void> => {
      const existing = tasksByProject[projectId] ?? []
      const alreadyInTarget = existing.filter(
        (t) => t.parentId === targetCheckpointId && !taskIds.includes(t.id)
      ).length
      let nextOrder = alreadyInTarget
      const taskIdSet = new Set(taskIds)
      const newTasks = existing.map((t) =>
        taskIdSet.has(t.id) ? { ...t, parentId: targetCheckpointId, order: nextOrder++ } : t
      )
      setTasksByProject((prev) => ({ ...prev, [projectId]: newTasks }))
      const project = projects.find((p) => p.id === projectId)!
      const data: ProjectFile = { version: 1, project, tasks: newTasks }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean; error?: { code: string; message: string }
      }
      if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')
    },
    [projects, tasksByProject]
  )

  const deleteTasksBulk = useCallback(
    async (projectId: string, taskIds: string[]): Promise<void> => {
      const existing = tasksByProject[projectId] ?? []
      const toDelete = new Set<string>()
      const collect = (id: string): void => {
        toDelete.add(id)
        existing.filter((t) => t.parentId === id).forEach((t) => collect(t.id))
      }
      taskIds.forEach((id) => collect(id))
      const newTasks = existing.filter((t) => !toDelete.has(t.id))
      setTasksByProject((prev) => ({ ...prev, [projectId]: newTasks }))
      const project = projects.find((p) => p.id === projectId)!
      const data: ProjectFile = { version: 1, project, tasks: newTasks }
      const result = (await window.api.invoke('data:save-project', { projectId, data })) as {
        ok: boolean; error?: { code: string; message: string }
      }
      if (!result.ok) throw new Error(result.error?.message ?? 'Save failed')
    },
    [projects, tasksByProject]
  )

  const listComments = useCallback(async (projectId: string, taskId: string): Promise<Comment[]> => {
    return (await window.api.invoke('comments:list', { projectId, taskId })) as Comment[]
  }, [])

  const addComment = useCallback(
    async (
      projectId: string,
      data: Omit<Comment, 'id' | 'createdAt' | 'authorName' | 'authorEmail'>
    ): Promise<Comment> => {
      const settings = (await window.api.invoke('settings:get')) as { name?: string; mailAddress?: string }
      const comment = {
        ...data,
        authorName: settings.name ?? '',
        authorEmail: settings.mailAddress ?? ''
      }
      return (await window.api.invoke('comments:add', { projectId, comment })) as Comment
    },
    []
  )

  const listIssues = useCallback(async (projectId: string, taskId: string | null): Promise<Issue[]> => {
    return (await window.api.invoke('issues:list', { projectId, taskId })) as Issue[]
  }, [])

  const createIssue = useCallback(
    async (projectId: string, taskId: string | null, data: { title: string; body: string; labels: string[] }): Promise<Issue> => {
      return (await window.api.invoke('issues:create', { projectId, taskId, ...data })) as Issue
    },
    []
  )

  const updateIssue = useCallback(
    async (projectId: string, issueId: string, changes: Partial<Issue>): Promise<Issue> => {
      return (await window.api.invoke('issues:update', { projectId, issueId, changes })) as Issue
    },
    []
  )

  const addIssueComment = useCallback(
    async (projectId: string, issueId: string, body: string): Promise<IssueComment> => {
      return (await window.api.invoke('issues:add-comment', { projectId, issueId, body })) as IssueComment
    },
    []
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
        reorderProjects,
        createTask,
        duplicateTaskTree,
        duplicateTaskTreeBulk,
        createCheckpoint,
        moveTaskToCheckpoint,
        moveTasksToCheckpointBulk,
        updateTask,
        deleteTask,
        deleteTasksBulk,
        saveProjectData,
        dismissLoadErrors,
        addGenre,
        updateGenres,
        listComments,
        addComment,
        listIssues,
        createIssue,
        updateIssue,
        addIssueComment
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
