import { useState, useRef, useEffect, useMemo } from 'react'
import { useData } from '../context/DataContext'
import type { Task, TaskStatus } from '../types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  'todo': 'TODO',
  'in-progress': '進行中',
  'in-review': 'レビュー中',
  'done': '完了'
}

const ALL_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'in-review', 'done']

type Props = {
  task: Task
  depth: number
  allTasks: Task[]
  editingTaskId: string | null
  onEditStart: (taskId: string) => void
  onEditEnd: () => void
}

export function TaskItem({ task, depth, allTasks, editingTaskId, onEditStart, onEditEnd }: Props): JSX.Element {
  const { updateTask, deleteTask, createTask } = useData()
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSubtaskForm, setShowSubtaskForm] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')

  // Edit state
  const [editTitle, setEditTitle] = useState(task.title)
  const [editGenre, setEditGenre] = useState(task.genre ?? '')
  const [editTags, setEditTags] = useState<string[]>(task.tags)
  const [newTag, setNewTag] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const editTitleRef = useRef<HTMLInputElement>(null)
  const subtaskRef = useRef<HTMLInputElement>(null)

  // Collect available tags from allTasks, excluding already-added ones
  const tagSuggestions = useMemo(() => {
    const all = new Set<string>()
    allTasks.forEach((t) => t.tags.forEach((tag) => all.add(tag)))
    return [...all].sort().filter((tag) => !editTags.includes(tag) && tag.includes(newTag))
  }, [allTasks, editTags, newTag])

  const isEditing = editingTaskId === task.id

  useEffect(() => {
    if (isEditing) {
      setEditTitle(task.title)
      setEditGenre(task.genre ?? '')
      setEditTags(task.tags)
      editTitleRef.current?.focus()
    }
  }, [isEditing, task])

  useEffect(() => {
    if (showSubtaskForm) subtaskRef.current?.focus()
  }, [showSubtaskForm])

  const childTasks = allTasks
    .filter((t) => t.parentId === task.id)
    .sort((a, b) => a.order - b.order)

  const descendantCount = (() => {
    const count = (id: string): number => {
      const children = allTasks.filter((t) => t.parentId === id)
      return children.reduce((sum, c) => sum + 1 + count(c.id), 0)
    }
    return count(task.id)
  })()

  const handleStatusChange = async (status: TaskStatus): Promise<void> => {
    setShowStatusDropdown(false)
    await updateTask(task.projectId, task.id, { status })
  }

  const handleEditConfirm = async (): Promise<void> => {
    const title = editTitle.trim()
    if (!title) return
    await updateTask(task.projectId, task.id, {
      title,
      genre: editGenre.trim() || null,
      tags: editTags
    })
    onEditEnd()
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleEditConfirm()
    if (e.key === 'Escape') onEditEnd()
  }

  const handleAddTag = (): void => {
    const tag = newTag.trim()
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag])
    }
    setNewTag('')
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    await deleteTask(task.projectId, task.id)
    setShowDeleteConfirm(false)
  }

  const handleSubtaskCreate = async (): Promise<void> => {
    const title = subtaskTitle.trim()
    if (!title) return
    await createTask(task.projectId, task.id, title, task)
    setSubtaskTitle('')
    setShowSubtaskForm(false)
  }

  const handleSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSubtaskCreate()
    if (e.key === 'Escape') {
      setSubtaskTitle('')
      setShowSubtaskForm(false)
    }
  }

  return (
    <div className={`task-item task-item--depth-${depth}`} style={{ marginLeft: depth * 20 }}>
      {isEditing ? (
        <div className="task-edit-form">
          <input
            ref={editTitleRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleEditKeyDown}
            placeholder="タスク名"
          />
          <input
            type="text"
            value={editGenre}
            onChange={(e) => setEditGenre(e.target.value)}
            placeholder="ジャンル（省略可）"
          />
          <div className="tag-editor">
            {editTags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
                <button onClick={() => setEditTags(editTags.filter((t) => t !== tag))}>×</button>
              </span>
            ))}
            <div className="tag-input-wrapper">
              <input
                type="text"
                value={newTag}
                onChange={(e) => { setNewTag(e.target.value); setShowTagSuggestions(true) }}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } if (e.key === 'Escape') setShowTagSuggestions(false) }}
                placeholder="タグ追加"
              />
              {showTagSuggestions && tagSuggestions.length > 0 && (
                <ul className="tag-suggestions">
                  {tagSuggestions.map((tag) => (
                    <li key={tag}>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); setEditTags([...editTags, tag]); setNewTag('') }}
                      >
                        {tag}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={handleAddTag}>追加</button>
          </div>
          <button onClick={handleEditConfirm}>確定</button>
          <button onClick={onEditEnd}>キャンセル</button>
        </div>
      ) : (
        <div className="task-row">
          {/* Status badge */}
          <div className="status-wrapper">
            <button
              className={`status-badge status-badge--${task.status}`}
              onClick={() => setShowStatusDropdown((v) => !v)}
            >
              {STATUS_LABELS[task.status]}
            </button>
            {showStatusDropdown && (
              <div className="status-dropdown">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    className={`status-option status-option--${s} ${task.status === s ? 'status-option--selected' : ''}`}
                    onClick={() => handleStatusChange(s)}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="task-title">{task.title}</span>
          {task.genre && <span className="task-genre">{task.genre}</span>}
          {task.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}

          <div className="task-actions">
            <button onClick={() => onEditStart(task.id)}>編集</button>
            {depth < 5 && (
              <button onClick={() => setShowSubtaskForm(true)}>+ サブタスク</button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)}>削除</button>
          </div>

          {showDeleteConfirm && (
            <div className="delete-confirm">
              <span>
                {descendantCount > 0
                  ? `このタスクと子タスク ${descendantCount} 件を削除しますか？`
                  : 'このタスクを削除しますか？'}
              </span>
              <button onClick={handleDeleteConfirm}>削除</button>
              <button onClick={() => setShowDeleteConfirm(false)}>キャンセル</button>
            </div>
          )}
        </div>
      )}

      {showSubtaskForm && (
        <div className="subtask-form" style={{ marginLeft: 20 }}>
          <input
            ref={subtaskRef}
            type="text"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            onKeyDown={handleSubtaskKeyDown}
            placeholder="サブタスク名"
          />
          <button onClick={handleSubtaskCreate}>追加</button>
          <button onClick={() => { setSubtaskTitle(''); setShowSubtaskForm(false) }}>キャンセル</button>
        </div>
      )}

      {/* Recursive children */}
      {childTasks.map((child) => (
        <TaskItem
          key={child.id}
          task={child}
          depth={depth + 1}
          allTasks={allTasks}
          editingTaskId={editingTaskId}
          onEditStart={onEditStart}
          onEditEnd={onEditEnd}
        />
      ))}
    </div>
  )
}
