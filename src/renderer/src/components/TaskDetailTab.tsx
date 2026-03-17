import { useState } from 'react'
import { useData } from '../context/DataContext'
import { GenrePicker } from './GenrePicker'
import type { Task, TaskStatus } from '../types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  'todo': 'TODO',
  'in-progress': '進行中',
  'in-review': 'レビュー中',
  'done': '完了'
}

const ALL_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'in-review', 'done']

type Props = {
  projectId: string
  taskId: string
}

type EditState = {
  title: string
  genre: string
  tags: string[]
  newTag: string
}

function TaskDetailRow({
  task,
  projectId,
  allTasks,
  depth
}: {
  task: Task
  projectId: string
  allTasks: Task[]
  depth: number
}): JSX.Element {
  const { updateTask, genres, addGenre } = useData()
  const isRoot = task.parentId === null
  const [editing, setEditing] = useState<EditState | null>(null)

  const children = allTasks
    .filter((t) => t.parentId === task.id)
    .sort((a, b) => a.order - b.order)

  const handleStartEdit = (): void => {
    setEditing({
      title: task.title,
      genre: task.genre ?? '',
      tags: task.tags,
      newTag: ''
    })
  }

  const handleSave = async (): Promise<void> => {
    if (!editing) return
    const title = editing.title.trim()
    if (!title) return
    const changes: Partial<Task> = { title, tags: editing.tags }
    if (isRoot) changes.genre = editing.genre.trim() || null
    await updateTask(projectId, task.id, changes)
    setEditing(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditing(null)
  }

  const handleAddTag = (): void => {
    if (!editing) return
    const tag = editing.newTag.trim()
    if (tag && !editing.tags.includes(tag)) {
      setEditing({ ...editing, tags: [...editing.tags, tag], newTag: '' })
    } else {
      setEditing({ ...editing, newTag: '' })
    }
  }

  const genreObj = isRoot ? genres.find((g) => g.name === task.genre) : null
  const badgeStyle = genreObj ? { backgroundColor: genreObj.color, color: '#fff' } : {}

  return (
    <div className="tdt-row-wrapper" style={{ paddingLeft: depth * 16 }}>
      <div className="tdt-row">
        {/* Status select */}
        <select
          className={`tdt-status tdt-status--${task.status}`}
          value={task.status}
          onChange={(e) => updateTask(projectId, task.id, { status: e.target.value as TaskStatus })}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        {editing ? (
          <div className="tdt-edit">
            <input
              autoFocus
              type="text"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="tdt-title-input"
            />
            {isRoot && (
              <GenrePicker
                value={editing.genre || null}
                genres={genres}
                onChange={(v) => setEditing({ ...editing, genre: v ?? '' })}
                onAddGenre={addGenre}
              />
            )}
            <div className="tdt-tag-editor">
              {editing.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setEditing({ ...editing, tags: editing.tags.filter((t) => t !== tag) }) }}
                  >×</button>
                </span>
              ))}
              <input
                type="text"
                value={editing.newTag}
                onChange={(e) => setEditing({ ...editing, newTag: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                placeholder="タグ追加"
                className="tdt-tag-input"
              />
            </div>
          </div>
        ) : (
          <button className="tdt-title" onClick={handleStartEdit}>
            {task.title}
          </button>
        )}

        {isRoot && task.genre && !editing && (
          <span className="task-genre" style={badgeStyle}>{task.genre}</span>
        )}

        {task.tags.length > 0 && !editing && (
          <div className="tdt-tags">
            {task.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
          </div>
        )}
      </div>

      {children.map((child) => (
        <TaskDetailRow
          key={child.id}
          task={child}
          projectId={projectId}
          allTasks={allTasks}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export function TaskDetailTab({ projectId, taskId }: Props): JSX.Element {
  const { tasksByProject } = useData()
  const allTasks = tasksByProject[projectId] ?? []
  const rootTask = allTasks.find((t) => t.id === taskId)

  if (!rootTask) return <p>タスクが見つかりません</p>

  return (
    <div className="task-detail-tab">
      <TaskDetailRow
        task={rootTask}
        projectId={projectId}
        allTasks={allTasks}
        depth={0}
      />
    </div>
  )
}
