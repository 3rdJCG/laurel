import { useState, useRef, useEffect, useMemo } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useData } from '../context/DataContext'
import { TaskItem } from '../components/TaskItem'
import { ErrorBanner } from '../components/ErrorBanner'
import type { Task } from '../types'

type Props = {
  projectId: string
  onNavigateHome: () => void
}

function filterTasksByVisibility(tasks: Task[], showCompleted: boolean): Task[] {
  if (showCompleted) return tasks
  const hiddenIds = new Set<string>()
  const markHidden = (id: string): void => {
    hiddenIds.add(id)
    tasks.filter((t) => t.parentId === id).forEach((t) => markHidden(t.id))
  }
  tasks.filter((t) => t.status === 'done').forEach((t) => markHidden(t.id))
  return tasks.filter((t) => !hiddenIds.has(t.id))
}

export function ProjectScreen({ projectId }: Props): JSX.Element {
  const { projects, tasksByProject, createTask, updateTask, saveProjectData } = useData()
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showCompletedTasks, setShowCompletedTasks] = useState(true)
  const [showAddRootForm, setShowAddRootForm] = useState(false)
  const [rootTaskTitle, setRootTaskTitle] = useState('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const rootInputRef = useRef<HTMLInputElement>(null)

  const project = projects.find((p) => p.id === projectId)
  const allTasks = tasksByProject[projectId] ?? []

  // Reset filters and expand state when projectId changes
  useEffect(() => {
    setFilterGenre('')
    setFilterTags([])
    setExpandedIds(new Set())
  }, [projectId])

  const handleToggleExpand = (taskId: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  // Collect available genres and tags from tasks
  const availableGenres = useMemo(() => {
    const genres = new Set<string>()
    allTasks.forEach((t) => { if (t.genre) genres.add(t.genre) })
    return [...genres].sort()
  }, [allTasks])

  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    allTasks.forEach((t) => t.tags.forEach((tag) => tags.add(tag)))
    return [...tags].sort()
  }, [allTasks])

  useEffect(() => {
    if (showAddRootForm) rootInputRef.current?.focus()
  }, [showAddRootForm])

  const handleAddRootTask = async (): Promise<void> => {
    const title = rootTaskTitle.trim()
    if (!title) return
    try {
      await createTask(projectId, null, title)
      setSaveError(null)
    } catch (err) {
      setSaveError(String(err))
    }
    setRootTaskTitle('')
    setShowAddRootForm(false)
  }

  const handleRetry = async (): Promise<void> => {
    try {
      await saveProjectData(projectId)
      setSaveError(null)
    } catch (err) {
      setSaveError(String(err))
    }
  }

  const handleRootDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const currentRootTasks = (tasksByProject[projectId] ?? [])
      .filter((t) => t.parentId === null)
      .sort((a, b) => a.order - b.order)
    const oldIndex = currentRootTasks.findIndex((t) => t.id === active.id)
    const newIndex = currentRootTasks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(currentRootTasks, oldIndex, newIndex)
    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].order !== i) {
          await updateTask(projectId, reordered[i].id, { order: i })
        }
      }
    } catch (err) {
      setSaveError(String(err))
    }
  }

  const handleRootKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleAddRootTask()
    if (e.key === 'Escape') { setRootTaskTitle(''); setShowAddRootForm(false) }
  }

  const filteredTasks = useMemo(() => {
    let tasks = filterTasksByVisibility(allTasks, showCompletedTasks)
    if (filterGenre) tasks = tasks.filter((t) => t.genre === filterGenre)
    if (filterTags.length > 0) tasks = tasks.filter((t) => filterTags.every((tag) => t.tags.includes(tag)))
    return tasks
  }, [allTasks, showCompletedTasks, filterGenre, filterTags])

  const rootTasks = filteredTasks
    .filter((t: Task) => t.parentId === null)
    .sort((a: Task, b: Task) => a.order - b.order)

  if (!project) {
    return (
      <div className="project-screen">
        <p>プロジェクトが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="project-screen">
      <header className="project-header">
        <h1>{project.name}</h1>
      </header>

      {saveError && (
        <ErrorBanner
          level="critical"
          message={`保存に失敗しました: ${saveError}`}
          onClose={() => setSaveError(null)}
          onRetry={handleRetry}
        />
      )}

      <div className="task-toolbar">
        <button
          className="toggle-completed-btn"
          onClick={() => setShowCompletedTasks((v) => !v)}
        >
          {showCompletedTasks ? '完了を隠す' : '完了を表示'}
        </button>

        {availableGenres.length > 0 && (
          <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)}>
            <option value="">すべてのジャンル</option>
            {availableGenres.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        {availableTags.length > 0 && (
          <div className="tag-filter">
            {availableTags.map((tag) => (
              <label key={tag} className={`tag-filter-item ${filterTags.includes(tag) ? 'tag-filter-item--active' : ''}`}>
                <input
                  type="checkbox"
                  checked={filterTags.includes(tag)}
                  onChange={(e) =>
                    setFilterTags((prev) =>
                      e.target.checked ? [...prev, tag] : prev.filter((t) => t !== tag)
                    )
                  }
                />
                {tag}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="task-list">
        {rootTasks.length === 0 ? (
          <p className="empty-message">
            {showCompletedTasks ? 'タスクはまだありません' : '該当するタスクがありません'}
          </p>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleRootDragEnd}>
            <SortableContext items={rootTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {rootTasks.map((task: Task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  depth={1}
                  allTasks={filteredTasks}
                  editingTaskId={editingTaskId}
                  onEditStart={(id) => setEditingTaskId(id)}
                  onEditEnd={() => setEditingTaskId(null)}
                  onSaveError={(msg) => setSaveError(msg)}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {showAddRootForm ? (
          <div className="root-task-form">
            <input
              ref={rootInputRef}
              type="text"
              value={rootTaskTitle}
              onChange={(e) => setRootTaskTitle(e.target.value)}
              onKeyDown={handleRootKeyDown}
              placeholder="タスク名"
            />
            <button onClick={handleAddRootTask}>追加</button>
            <button onClick={() => { setRootTaskTitle(''); setShowAddRootForm(false) }}>キャンセル</button>
          </div>
        ) : (
          <button className="add-task-btn" onClick={() => setShowAddRootForm(true)}>
            ＋ タスクを追加
          </button>
        )}
      </div>
    </div>
  )
}
