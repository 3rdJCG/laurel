import { useState, useRef, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { GenrePicker } from '../components/GenrePicker'
import { KanbanView } from '../components/KanbanView'
import { IssuesTab } from '../components/IssuesTab'
import { MarkdownTab } from '../components/MarkdownTab'
import type { Task } from '../types'

// ── TaskInfoHeader ─────────────────────────────────────────────────────────────

type HeaderProps = {
  task: Task
  projectId: string
}

function TaskInfoHeader({ task, projectId }: HeaderProps): JSX.Element {
  const { updateTask, genres, addGenre } = useData()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editGenre, setEditGenre] = useState(task.genre ?? '')
  const [editTags, setEditTags] = useState<string[]>(task.tags)
  const [editOccurredAt, setEditOccurredAt] = useState(task.occurredAt ?? '')
  const [editDueAt, setEditDueAt] = useState(task.dueAt ?? '')
  const [newTag, setNewTag] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) {
      setEditTitle(task.title)
      setEditGenre(task.genre ?? '')
      setEditTags(task.tags)
      setEditOccurredAt(task.occurredAt ?? '')
      setEditDueAt(task.dueAt ?? '')
    }
  }, [task, editing])

  useEffect(() => {
    if (editing) titleRef.current?.focus()
  }, [editing])

  const handleSave = async (): Promise<void> => {
    const title = editTitle.trim()
    if (!title) return
    await updateTask(projectId, task.id, {
      title,
      genre: editGenre.trim() || null,
      tags: editTags,
      occurredAt: editOccurredAt || null,
      dueAt: editDueAt || null
    })
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditing(false)
  }

  const handleAddTag = (tag: string): void => {
    const t = tag.trim()
    if (t && !editTags.includes(t)) setEditTags([...editTags, t])
    setNewTag('')
  }

  const genreObj = genres.find((g) => g.name === task.genre)
  const badgeStyle = genreObj ? { backgroundColor: genreObj.color, color: '#fff' } : {}

  if (editing) {
    return (
      <div className="task-info-header task-info-header--editing">
        <div className="task-info-edit-row">
          <input
            ref={titleRef}
            type="text"
            className="task-info-title-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="タスク名"
          />
          <GenrePicker
            value={editGenre || null}
            genres={genres}
            onChange={(v) => setEditGenre(v ?? '')}
            onAddGenre={addGenre}
          />
        </div>

        <div className="task-info-tags-row">
          {editTags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button onClick={() => setEditTags(editTags.filter((t) => t !== tag))}>×</button>
            </span>
          ))}
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(newTag) } }}
            placeholder="タグ追加"
            className="task-info-tag-input"
          />
        </div>

        <div className="task-info-dates-row">
          <label className="task-edit-date-label">
            発生日
            <input type="date" value={editOccurredAt} onChange={(e) => setEditOccurredAt(e.target.value)} />
          </label>
          <label className="task-edit-date-label">
            期限日
            <input type="date" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} />
          </label>
        </div>

        <div className="task-info-edit-actions">
          <button className="btn-confirm" onClick={handleSave}>確定</button>
          <button className="btn-cancel" onClick={() => setEditing(false)}>キャンセル</button>
        </div>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueInfo = task.dueAt
    ? (() => {
        const due = new Date(task.dueAt)
        due.setHours(0, 0, 0, 0)
        const days = Math.round((due.getTime() - today.getTime()) / 86400000)
        return { days, overdue: days < 0 }
      })()
    : null

  return (
    <div className="task-info-header">
      <div className="task-info-top">
        <button className="task-info-title" onClick={() => setEditing(true)}>
          {task.title}
        </button>
        {task.genre && (
          <span className="task-genre" style={badgeStyle}>{task.genre}</span>
        )}
        {dueInfo && (
          <span className={`task-date${dueInfo.overdue ? ' task-date--overdue' : ''}`}>
            期限: {dueInfo.days} Day
          </span>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="task-info-tags">
          {task.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TaskDetailScreen ───────────────────────────────────────────────────────────

type Props = {
  projectId: string
  taskId: string
  onNavigateBack: () => void
}

type Tab = 'detail' | 'kanban' | 'issues'

export function TaskDetailScreen({ projectId, taskId, onNavigateBack }: Props): JSX.Element {
  const { projects, tasksByProject, listIssues } = useData()
  const [activeTab, setActiveTab] = useState<Tab>('detail')
  const [openIssueCount, setOpenIssueCount] = useState(0)

  useEffect(() => {
    listIssues(projectId, taskId).then((issues) => {
      setOpenIssueCount(issues.filter((i) => i.status === 'open').length)
    })
  }, [projectId, taskId])

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
        <button
          className={`repo-tab ${activeTab === 'issues' ? 'repo-tab--active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          Issues
          {openIssueCount > 0 && (
            <span className="repo-tab-count">{openIssueCount}</span>
          )}
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
        {activeTab === 'issues' && (
          <IssuesTab
            projectId={projectId}
            taskId={taskId}
            onOpenCountChange={setOpenIssueCount}
          />
        )}
      </div>
    </div>
  )
}
