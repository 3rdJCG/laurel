import { useState, useRef, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { GenrePicker } from '../components/GenrePicker'
import { KanbanView } from '../components/KanbanView'
import { MarkdownTab } from '../components/MarkdownTab'
import type { Task } from '../types'

// ── TaskInfoHeader ─────────────────────────────────────────────────────────────

type HeaderProps = {
  task: Task
  projectId: string
}

function TaskInfoHeader({ task, projectId }: HeaderProps): JSX.Element {
  const { updateTask, genres, addGenre } = useData()
  const [editTitle, setEditTitle] = useState(task.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTag, setNewTag] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editingTitle) setEditTitle(task.title)
  }, [task.title, editingTitle])

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus()
  }, [editingTitle])

  const saveTitle = async (): Promise<void> => {
    const title = editTitle.trim()
    if (!title || title === task.title) { setEditingTitle(false); return }
    await updateTask(projectId, task.id, { title })
    setEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') saveTitle()
    if (e.key === 'Escape') { setEditTitle(task.title); setEditingTitle(false) }
  }

  const handleAddTag = async (tag: string): Promise<void> => {
    const t = tag.trim()
    if (!t || task.tags.includes(t)) { setNewTag(''); return }
    await updateTask(projectId, task.id, { tags: [...task.tags, t] })
    setNewTag('')
  }

  const handleRemoveTag = async (tag: string): Promise<void> => {
    await updateTask(projectId, task.id, { tags: task.tags.filter((t) => t !== tag) })
  }

  return (
    <div className="task-info-header task-info-header--always-edit">
      {/* Title */}
      <div className="task-info-title-row">
        {editingTitle ? (
          <input
            ref={titleRef}
            type="text"
            className="task-info-title-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={saveTitle}
          />
        ) : (
          <button className="task-info-title" onClick={() => setEditingTitle(true)}>
            {task.title}
          </button>
        )}
      </div>

      {/* Genre */}
      <div className="task-info-meta-row">
        <span className="task-info-meta-label">ジャンル</span>
        <GenrePicker
          value={task.genre ?? null}
          genres={genres}
          onChange={(v) => updateTask(projectId, task.id, { genre: v ?? null })}
          onAddGenre={addGenre}
        />
      </div>

      {/* Tags */}
      <div className="task-info-meta-row">
        <span className="task-info-meta-label">タグ</span>
        <div className="task-info-tags-inline">
          {task.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button onClick={() => handleRemoveTag(tag)}>×</button>
            </span>
          ))}
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(newTag) } }}
            placeholder="+ タグ追加"
            className="task-info-tag-input"
          />
        </div>
      </div>

      {/* Occurred date */}
      <div className="task-info-meta-row">
        <span className="task-info-meta-label">発生日</span>
        <input
          type="date"
          value={task.occurredAt ?? ''}
          onChange={(e) => updateTask(projectId, task.id, { occurredAt: e.target.value || null })}
          className="task-info-date-input"
        />
      </div>

      {/* Due date */}
      <div className="task-info-meta-row">
        <span className="task-info-meta-label">期限日</span>
        <input
          type="date"
          value={task.dueAt ?? ''}
          onChange={(e) => updateTask(projectId, task.id, { dueAt: e.target.value || null })}
          className="task-info-date-input"
        />
      </div>
    </div>
  )
}

// ── TaskDetailScreen ───────────────────────────────────────────────────────────

type Props = {
  projectId: string
  taskId: string
  onNavigateBack: () => void
}

type Tab = 'detail' | 'kanban'

export function TaskDetailScreen({ projectId, taskId, onNavigateBack }: Props): JSX.Element {
  const { projects, tasksByProject } = useData()
  const [activeTab, setActiveTab] = useState<Tab>('detail')

  const project = projects.find((p) => p.id === projectId)
  const allTasks = tasksByProject[projectId] ?? []
  const task = allTasks.find((t) => t.id === taskId)

  if (!task) {
    return (
      <div className="repo-view">
        <p>タスクが見つかりません</p>
        <button onClick={onNavigateBack}>戻る</button>
      </div>
    )
  }

  return (
    <div className="repo-view">
      {/* Breadcrumb header */}
      <header className="repo-header">
        <button className="repo-back-btn" onClick={onNavigateBack}>← 戻る</button>
        <div className="repo-breadcrumb">
          <span className="repo-project-name">{project?.name ?? projectId}</span>
          <span className="repo-slash"> / </span>
          <span className="repo-task-name">{task.title}</span>
        </div>
      </header>

      {/* Tab bar */}
      <div className="repo-tabs">
        <button
          className={`repo-tab ${activeTab === 'detail' ? 'repo-tab--active' : ''}`}
          onClick={() => setActiveTab('detail')}
        >
          Detail
        </button>
        <button
          className={`repo-tab ${activeTab === 'kanban' ? 'repo-tab--active' : ''}`}
          onClick={() => setActiveTab('kanban')}
        >
          Kanban
        </button>
      </div>

      <div className="repo-tab-content">
        {activeTab === 'detail' && (
          <div className="repo-tasks-panel">
            <TaskInfoHeader task={task} projectId={projectId} />
            <MarkdownTab task={task} projectId={projectId} />
          </div>
        )}
        {activeTab === 'kanban' && (
          <KanbanView projectId={projectId} parentTaskId={taskId} />
        )}
      </div>
    </div>
  )
}
