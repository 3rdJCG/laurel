import { useState, useRef, useEffect, useMemo } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  onSaveError?: (message: string) => void
  expandedIds: Set<string>
  onToggleExpand: (taskId: string) => void
  onNavigate?: (taskId: string) => void
}


export function TaskItem({ task, depth, allTasks, onSaveError, expandedIds, onToggleExpand, onNavigate }: Props): JSX.Element {
  const { updateTask, deleteTask, createTask, genres, addGenre } = useData()
  const isRoot = task.parentId === null

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const sortableStyle = { transform: CSS.Transform.toString(transform), transition }
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const [newGenreName, setNewGenreName] = useState('')
  const [showAddGenreForm, setShowAddGenreForm] = useState(false)
  const genreSlotRef = useRef<HTMLDivElement>(null)
  const [showSubtaskForm, setShowSubtaskForm] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')

  // Inline title edit
  const [showTitleInput, setShowTitleInput] = useState(false)
  const [inlineTitleVal, setInlineTitleVal] = useState(task.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Inline tag editor
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  // Inline occurredAt edit
  const [showOccurredAtInput, setShowOccurredAtInput] = useState(false)
  const [inlineOccurredAt, setInlineOccurredAt] = useState(task.occurredAt ?? '')
  const occurredAtInputRef = useRef<HTMLInputElement>(null)

  // Inline dueAt edit
  const [showDueDateInput, setShowDueDateInput] = useState(false)
  const [inlineDueAt, setInlineDueAt] = useState(task.dueAt ?? '')
  const dueDateInputRef = useRef<HTMLInputElement>(null)

  const subtaskRef = useRef<HTMLInputElement>(null)

  const tagSuggestions = useMemo(() => {
    const all = new Set<string>()
    allTasks.forEach((t) => t.tags.forEach((tag) => all.add(tag)))
    return [...all].sort().filter((tag) => !task.tags.includes(tag) && tag.includes(newTag))
  }, [allTasks, task.tags, newTag])

  useEffect(() => {
    if (showTitleInput) {
      setInlineTitleVal(task.title)
      titleInputRef.current?.focus()
    }
  }, [showTitleInput, task.title])

  useEffect(() => {
    if (showTagInput) tagInputRef.current?.focus()
  }, [showTagInput])

  useEffect(() => {
    if (showOccurredAtInput) occurredAtInputRef.current?.focus()
  }, [showOccurredAtInput])

  useEffect(() => {
    if (showDueDateInput) dueDateInputRef.current?.focus()
  }, [showDueDateInput])

  useEffect(() => {
    if (showSubtaskForm) subtaskRef.current?.focus()
  }, [showSubtaskForm])

  useEffect(() => {
    setInlineDueAt(task.dueAt ?? '')
  }, [task.dueAt])

  useEffect(() => {
    setInlineOccurredAt(task.occurredAt ?? '')
  }, [task.occurredAt])

  useEffect(() => {
    if (!showGenreDropdown) return
    const handle = (e: MouseEvent): void => {
      if (genreSlotRef.current && !genreSlotRef.current.contains(e.target as Node)) {
        setShowGenreDropdown(false)
        setShowAddGenreForm(false)
        setNewGenreName('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showGenreDropdown])

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

  const handleGenreSelect = async (genre: string | null): Promise<void> => {
    setShowGenreDropdown(false)
    setShowAddGenreForm(false)
    setNewGenreName('')
    try {
      await updateTask(task.projectId, task.id, { genre })
    } catch (err) {
      onSaveError?.(String(err))
    }
  }

  const handleAddGenreSubmit = async (): Promise<void> => {
    const name = newGenreName.trim()
    if (!name) return
    await addGenre(name)
    await handleGenreSelect(name)
  }

  const handleStatusChange = async (status: TaskStatus): Promise<void> => {
    setShowStatusDropdown(false)
    try {
      await updateTask(task.projectId, task.id, { status })
    } catch (err) {
      onSaveError?.(String(err))
    }
  }

  const handleTitleSave = async (): Promise<void> => {
    const title = inlineTitleVal.trim()
    setShowTitleInput(false)
    if (!title || title === task.title) return
    try {
      await updateTask(task.projectId, task.id, { title })
    } catch (err) {
      onSaveError?.(String(err))
    }
  }

  const handleRemoveTag = async (tag: string): Promise<void> => {
    try {
      await updateTask(task.projectId, task.id, { tags: task.tags.filter((t) => t !== tag) })
    } catch (err) {
      onSaveError?.(String(err))
    }
  }

  const handleAddTagInline = async (tagToAdd?: string): Promise<void> => {
    const tag = (tagToAdd ?? newTag).trim()
    setNewTag('')
    if (!tagToAdd) setShowTagInput(false)
    if (!tag || task.tags.includes(tag)) return
    try {
      await updateTask(task.projectId, task.id, { tags: [...task.tags, tag] })
    } catch (err) {
      onSaveError?.(String(err))
    }
  }

  const handleOccurredAtChange = async (value: string): Promise<void> => {
    setShowOccurredAtInput(false)
    if (value === (task.occurredAt ?? '')) return
    try {
      await updateTask(task.projectId, task.id, { occurredAt: value || null })
    } catch (err) {
      onSaveError?.(String(err))
    }
  }

  const handleDueDateChange = async (value: string): Promise<void> => {
    setShowDueDateInput(false)
    if (value === (task.dueAt ?? '')) return
    try {
      await updateTask(task.projectId, task.id, { dueAt: value || null })
    } catch (err) {
      onSaveError?.(String(err))
    }
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    try {
      await deleteTask(task.projectId, task.id)
    } catch (err) {
      onSaveError?.(String(err))
    }
    setShowDeleteConfirm(false)
  }

  const handleSubtaskCreate = async (): Promise<void> => {
    const title = subtaskTitle.trim()
    if (!title) return
    try {
      await createTask(task.projectId, task.id, title, task)
    } catch (err) {
      onSaveError?.(String(err))
    }
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

  const handleChildDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = childTasks.findIndex((t) => t.id === active.id)
    const newIndex = childTasks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(childTasks, oldIndex, newIndex)
    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].order !== i) {
          await updateTask(reordered[i].projectId, reordered[i].id, { order: i })
        }
      }
    } catch (err) {
      onSaveError?.(String(err))
    }
  }

  const isExpanded = expandedIds.has(task.id)
  const hasChildren = childTasks.length > 0

  return (
    <div ref={setNodeRef} style={sortableStyle} className={`task-item task-item--depth-${depth}`}>
      <div className="task-row">
        {/* Drag handle */}
        <button className="drag-handle" {...attributes} {...listeners} aria-label="ドラッグ">⠿</button>

        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button className="expand-toggle" onClick={() => onToggleExpand(task.id)}>
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="expand-toggle-placeholder" />
        )}

        {/* Genre badge */}
        <div className="task-genre-slot" ref={genreSlotRef}>
          {isRoot && (() => {
            const genreObj = genres.find((g) => g.name === task.genre)
            const badgeStyle = genreObj ? { backgroundColor: genreObj.color, color: '#fff' } : {}
            return (
              <>
                <button
                  className={`task-genre${task.genre ? '' : ' task-genre--empty'}`}
                  style={badgeStyle}
                  onClick={() => { setShowGenreDropdown((v) => !v); setShowAddGenreForm(false) }}
                  title="ジャンルを変更"
                >
                  {task.genre ?? '＋'}
                </button>
                {showGenreDropdown && (
                  <div className="task-genre-dropdown">
                    <button className="task-genre-dropdown-item" onClick={() => handleGenreSelect(null)}>
                      <span className="task-genre-dropdown-none">なし</span>
                    </button>
                    {genres.map((g) => (
                      <button
                        key={g.name}
                        className={`task-genre-dropdown-item${task.genre === g.name ? ' task-genre-dropdown-item--selected' : ''}`}
                        onClick={() => handleGenreSelect(g.name)}
                      >
                        <span className="genre-picker-swatch" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </button>
                    ))}
                    <div className="genre-picker-divider" />
                    {showAddGenreForm ? (
                      <div className="genre-picker-add-form">
                        <input
                          type="text"
                          value={newGenreName}
                          onChange={(e) => setNewGenreName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGenreSubmit() } }}
                          placeholder="ジャンル名"
                          autoFocus
                        />
                        <button type="button" onClick={handleAddGenreSubmit}>追加</button>
                        <button type="button" onClick={() => { setShowAddGenreForm(false); setNewGenreName('') }}>✕</button>
                      </div>
                    ) : (
                      <button className="genre-picker-add-btn" onClick={() => setShowAddGenreForm(true)}>
                        + 新しいジャンルを追加
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {/* Title — click pencil icon to edit inline */}
        <div className="task-title-wrapper">
          {showTitleInput ? (
            <input
              ref={titleInputRef}
              type="text"
              className="task-title-input"
              value={inlineTitleVal}
              onChange={(e) => setInlineTitleVal(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave()
                if (e.key === 'Escape') { setInlineTitleVal(task.title); setShowTitleInput(false) }
              }}
            />
          ) : onNavigate ? (
            <button className="task-title task-title--link" onClick={() => onNavigate(task.id)}>
              {task.title}
            </button>
          ) : (
            <span className="task-title">{task.title}</span>
          )}
          {!showTitleInput && (
            <button
              className="task-title-edit-btn"
              onClick={(e) => { e.stopPropagation(); setShowTitleInput(true) }}
              title="タイトルを編集"
            >✏</button>
          )}
        </div>

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

        {/* Due date — click to edit inline */}
        <span className="task-due-date">
          {showDueDateInput ? (
            <input
              ref={dueDateInputRef}
              type="date"
              value={inlineDueAt}
              className="task-due-date-input"
              onChange={(e) => setInlineDueAt(e.target.value)}
              onBlur={(e) => handleDueDateChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDueDateChange(inlineDueAt)
                if (e.key === 'Escape') setShowDueDateInput(false)
              }}
            />
          ) : task.dueAt ? (() => {
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const due = new Date(task.dueAt!); due.setHours(0, 0, 0, 0)
            const days = Math.round((due.getTime() - today.getTime()) / 86400000)
            const isOverdue = days < 0
            return (
              <button
                className={`task-date${isOverdue ? ' task-date--overdue' : ''}`}
                onClick={() => setShowDueDateInput(true)}
                title={task.dueAt!}
              >
                {days} days
              </button>
            )
          })() : (
            <button className="task-date-add" onClick={() => setShowDueDateInput(true)}>
              + 期限
            </button>
          )}
        </span>

        {/* Occurred at — click to edit inline */}
        <span className="task-occurred-at">
          {showOccurredAtInput ? (
            <input
              ref={occurredAtInputRef}
              type="date"
              value={inlineOccurredAt}
              className="task-due-date-input"
              onChange={(e) => setInlineOccurredAt(e.target.value)}
              onBlur={(e) => handleOccurredAtChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleOccurredAtChange(inlineOccurredAt)
                if (e.key === 'Escape') setShowOccurredAtInput(false)
              }}
            />
          ) : task.occurredAt ? (() => {
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const occ = new Date(task.occurredAt!); occ.setHours(0, 0, 0, 0)
            const days = Math.round((today.getTime() - occ.getTime()) / 86400000)
            return (
              <button
                className="task-date"
                onClick={() => setShowOccurredAtInput(true)}
                title={task.occurredAt!}
              >
                {days}d前
              </button>
            )
          })() : (
            <button className="task-date-add task-date-add--ghost" onClick={() => setShowOccurredAtInput(true)}>
              + 発生日
            </button>
          )}
        </span>

        {/* Tags — inline editable */}
        <div className="task-tags">
          {task.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button className="tag-remove-btn" onClick={() => handleRemoveTag(tag)} title="削除">×</button>
            </span>
          ))}
          {showTagInput ? (
            <div className="tag-input-wrapper">
              <input
                ref={tagInputRef}
                type="text"
                className="task-tag-input"
                value={newTag}
                onChange={(e) => { setNewTag(e.target.value); setShowTagSuggestions(true) }}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => { setShowTagSuggestions(false); setShowTagInput(false); setNewTag('') }, 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddTagInline() }
                  if (e.key === 'Escape') { setShowTagInput(false); setNewTag('') }
                }}
                placeholder="タグ"
              />
              {showTagSuggestions && tagSuggestions.length > 0 && (
                <ul className="tag-suggestions">
                  {tagSuggestions.map((tag) => (
                    <li key={tag}>
                      <button onMouseDown={(e) => { e.preventDefault(); handleAddTagInline(tag) }}>
                        {tag}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <button className="task-tag-add-btn" onClick={() => setShowTagInput(true)} title="タグを追加">+</button>
          )}
        </div>

        {/* Actions */}
        <div className="task-actions">
          {depth === 0 && (
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

      {showSubtaskForm && (
        <div className="subtask-form" style={{ marginLeft: depth * 12 + 12 }}>
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
      {hasChildren && isExpanded && (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleChildDragEnd}>
          <SortableContext items={childTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {childTasks.map((child) => (
              <TaskItem
                key={child.id}
                task={child}
                depth={depth + 1}
                allTasks={allTasks}
                onSaveError={onSaveError}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
