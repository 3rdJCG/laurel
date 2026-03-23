import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable
} from '@dnd-kit/sortable'
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

// ── KanbanCard ────────────────────────────────────────────────────────────────

type CardProps = {
  task: Task
  projectId: string
  isOverlay?: boolean
}

function KanbanCard({ task, projectId, isOverlay = false }: CardProps): JSX.Element {
  const { updateTask, deleteTask } = useData()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'card', status: task.status }
  })

  const style = isOverlay
    ? { boxShadow: '0 8px 24px rgba(0,0,0,0.6)', rotate: '1.5deg', opacity: 0.95 }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
      }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!editing) setEditTitle(task.title)
  }, [task.title, editing])

  const handleSave = async (): Promise<void> => {
    const title = editTitle.trim()
    if (!title) {
      setEditing(false)
      setEditTitle(task.title)
      return
    }
    await updateTask(projectId, task.id, { title })
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditing(false)
      setEditTitle(task.title)
    }
  }

  const handleDelete = async (): Promise<void> => {
    await deleteTask(projectId, task.id)
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
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`kanban-card${isDragging ? ' kanban-card--dragging' : ''}`}
    >
      <div className="kanban-card-body">
        {/* Drag handle */}
        {!isOverlay && !editing && (
          <button
            className="kanban-card-drag-handle"
            {...attributes}
            {...listeners}
            tabIndex={-1}
            aria-label="ドラッグ"
          >
            ⠿
          </button>
        )}

        {editing ? (
          <input
            ref={inputRef}
            className="kanban-card-title-input"
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
          />
        ) : (
          <button className="kanban-card-title" onClick={() => setEditing(true)}>
            {task.title}
          </button>
        )}
      </div>

      {(task.tags.length > 0 || dueInfo) && (
        <div className="kanban-card-meta">
          {task.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          {dueInfo && (
            <span className={`kanban-card-due${dueInfo.overdue ? ' kanban-card-due--overdue' : ''}`}>
              {dueInfo.days} Day
            </span>
          )}
        </div>
      )}

      <div className="kanban-card-actions">
        {!showDeleteConfirm ? (
          <button className="kanban-card-delete" onClick={() => setShowDeleteConfirm(true)}>削除</button>
        ) : (
          <div className="kanban-card-delete-confirm">
            <span>削除しますか？</span>
            <button onClick={handleDelete}>削除</button>
            <button onClick={() => setShowDeleteConfirm(false)}>キャンセル</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

type ColumnProps = {
  status: TaskStatus
  tasks: Task[]
  projectId: string
  parentTaskId: string
}

function KanbanColumn({ status, tasks, projectId, parentTaskId }: ColumnProps): JSX.Element {
  const { createTask, updateTask } = useData()
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Make the whole column droppable so empty columns accept drops
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: status,
    data: { type: 'column', status }
  })

  useEffect(() => {
    if (showForm) inputRef.current?.focus()
  }, [showForm])

  const handleAdd = async (): Promise<void> => {
    const title = newTitle.trim()
    if (!title) return
    const task = await createTask(projectId, parentTaskId, title)
    if (status !== 'todo') {
      await updateTask(projectId, task.id, { status })
    }
    setNewTitle('')
    setShowForm(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') {
      setNewTitle('')
      setShowForm(false)
    }
  }

  const columnTasks = tasks
    .filter((t) => t.status === status)
    .sort((a, b) => a.order - b.order)

  return (
    <div className={`kanban-column${isOver ? ' kanban-column--over' : ''}`}>
      <div className={`kanban-column-header kanban-column-header--${status}`}>
        <span className="kanban-column-title">{STATUS_LABELS[status]}</span>
        <span className="kanban-column-count">{columnTasks.length}</span>
      </div>

      <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setDropRef} className="kanban-column-cards">
          {columnTasks.map((task) => (
            <KanbanCard key={task.id} task={task} projectId={projectId} />
          ))}
        </div>
      </SortableContext>

      <div className="kanban-column-footer">
        {showForm ? (
          <div className="kanban-add-form">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="タスク名"
            />
            <div className="kanban-add-form-actions">
              <button onClick={handleAdd}>追加</button>
              <button onClick={() => { setNewTitle(''); setShowForm(false) }}>キャンセル</button>
            </div>
          </div>
        ) : (
          <button className="kanban-add-btn" onClick={() => setShowForm(true)}>
            ＋ タスクを追加
          </button>
        )}
      </div>
    </div>
  )
}

// ── KanbanView ────────────────────────────────────────────────────────────────

type Props = {
  projectId: string
  parentTaskId: string
}

export function KanbanView({ projectId, parentTaskId }: Props): JSX.Element {
  const { tasksByProject, updateTask } = useData()
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const allTasks = tasksByProject[projectId] ?? []
  const childTasks = allTasks.filter((t) => t.parentId === parentTaskId)
  const activeTask = activeDragId ? childTasks.find((t) => t.id === activeDragId) ?? null : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    setActiveDragId(null)

    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const draggedTask = childTasks.find((t) => t.id === activeId)
    if (!draggedTask) return

    const overIsColumn = (ALL_STATUSES as string[]).includes(overId)
    const overTask = overIsColumn ? null : childTasks.find((t) => t.id === overId)
    const targetStatus: TaskStatus = overIsColumn
      ? (overId as TaskStatus)
      : (overTask?.status ?? draggedTask.status)

    if (draggedTask.status !== targetStatus) {
      // Cross-column: update status, append to end of target column
      const targetColumnTasks = childTasks
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.order - b.order)
      const newOrder = overTask
        ? targetColumnTasks.findIndex((t) => t.id === overId)
        : targetColumnTasks.length
      await updateTask(projectId, activeId, {
        status: targetStatus,
        order: newOrder < 0 ? targetColumnTasks.length : newOrder
      })
    } else if (!overIsColumn) {
      // Same column: reorder
      const columnTasks = childTasks
        .filter((t) => t.status === draggedTask.status)
        .sort((a, b) => a.order - b.order)
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
      const newIndex = columnTasks.findIndex((t) => t.id === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      const reordered = arrayMove(columnTasks, oldIndex, newIndex)
      await Promise.all(
        reordered
          .map((t, i) => (t.order !== i ? updateTask(projectId, t.id, { order: i }) : null))
          .filter(Boolean)
      )
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {ALL_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={childTasks}
            projectId={projectId}
            parentTaskId={parentTaskId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <KanbanCard task={activeTask} projectId={projectId} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
