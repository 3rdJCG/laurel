import { useState, useRef, useEffect, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { TaskItem } from '../components/TaskItem'
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
  const { projects, tasksByProject, createTask } = useData()
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [showCompletedTasks, setShowCompletedTasks] = useState(true)
  const [showAddRootForm, setShowAddRootForm] = useState(false)
  const [rootTaskTitle, setRootTaskTitle] = useState('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const rootInputRef = useRef<HTMLInputElement>(null)

  const project = projects.find((p) => p.id === projectId)
  const allTasks = tasksByProject[projectId] ?? []

  // Reset filters when projectId changes
  useEffect(() => {
    setFilterGenre('')
    setFilterTags([])
  }, [projectId])

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
    await createTask(projectId, null, title)
    setRootTaskTitle('')
    setShowAddRootForm(false)
  }

  const handleRootKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleAddRootTask()
    if (e.key === 'Escape') { setRootTaskTitle(''); setShowAddRootForm(false) }
  }

  if (!project) {
    return (
      <div className="project-screen">
        <p>プロジェクトが見つかりません</p>
      </div>
    )
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

  return (
    <div className="project-screen">
      <header className="project-header">
        <h1>{project.name}</h1>
      </header>

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
          rootTasks.map((task: Task) => (
            <TaskItem
              key={task.id}
              task={task}
              depth={1}
              allTasks={filteredTasks}
              editingTaskId={editingTaskId}
              onEditStart={(id) => setEditingTaskId(id)}
              onEditEnd={() => setEditingTaskId(null)}
            />
          ))
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
