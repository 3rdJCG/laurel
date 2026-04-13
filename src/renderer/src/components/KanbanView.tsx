import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
import {
  Paper, Badge, Group, Stack, Text, TextInput,
  Button, ActionIcon, UnstyledButton, Box, Popover, Menu
} from '@mantine/core'
import { IconFlag } from '@tabler/icons-react'
import { useData } from '../context/DataContext'
import type { Task, TaskStatus } from '../types'
import { STATUS_COLORS, STATUS_LABELS, ALL_STATUSES } from '../constants/statusColors'

// ── KanbanCard ────────────────────────────────────────────────────────────────

type CardProps = {
  task: Task
  projectId: string
  isOverlay?: boolean
  availableCPs?: Task[]
  onMoveToCheckpoint?: (taskId: string, cpId: string) => void
}

function KanbanCard({ task, projectId, isOverlay = false, availableCPs = [], onMoveToCheckpoint }: CardProps): JSX.Element {
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
        transform: CSS.Translate.toString(transform),
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
    if (!title) { setEditing(false); setEditTitle(task.title); return }
    await updateTask(projectId, task.id, { title })
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditing(false); setEditTitle(task.title) }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dueInfo = task.dueAt
    ? (() => {
        const due = new Date(task.dueAt); due.setHours(0, 0, 0, 0)
        const days = Math.round((due.getTime() - today.getTime()) / 86400000)
        return { days, overdue: days < 0 }
      })()
    : null

  return (
    <Paper
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      shadow="xs"
      p="xs"
      radius="sm"
      withBorder
      mb={6}
      className={`kanban-card${isDragging ? ' kanban-card--dragging' : ''}`}
    >
      <Stack gap={4}>
        <Group gap={4} wrap="nowrap" align="flex-start">
          {!isOverlay && !editing && (
            <UnstyledButton
              {...attributes}
              {...listeners}
              tabIndex={-1}
              aria-label="ドラッグ"
              style={{ cursor: 'grab', color: 'var(--mantine-color-dark-3)', fontSize: 14, flexShrink: 0, paddingTop: 2 }}
            >
              ⠿
            </UnstyledButton>
          )}
          {editing ? (
            <TextInput
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              size="xs"
              style={{ flex: 1 }}
            />
          ) : (
            <UnstyledButton
              onClick={() => setEditing(true)}
              style={{ flex: 1, textAlign: 'left' }}
            >
              <Text size="xs">{task.title}</Text>
            </UnstyledButton>
          )}
          {availableCPs.length > 0 && onMoveToCheckpoint && (
            <Menu shadow="md" width={160} position="top-end">
              <Menu.Target>
                <ActionIcon variant="subtle" size="xs" style={{ flexShrink: 0 }} title="Phaseに移動">
                  <IconFlag size={11} stroke={1.5} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Phaseに移動</Menu.Label>
                {availableCPs.map((cp) => (
                  <Menu.Item key={cp.id} onClick={() => onMoveToCheckpoint(task.id, cp.id)}>
                    <Text size="xs">{cp.title}</Text>
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
          <Popover opened={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} withArrow shadow="md" position="top">
            <Popover.Target>
              <ActionIcon
                variant="subtle"
                size="xs"
                color="red"
                onClick={() => setShowDeleteConfirm(true)}
                style={{ flexShrink: 0 }}
              >
                ×
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap={6}>
                <Text size="xs">削除しますか？</Text>
                <Group gap={4}>
                  <Button size="xs" color="red" onClick={() => deleteTask(projectId, task.id)}>削除</Button>
                  <Button size="xs" variant="default" onClick={() => setShowDeleteConfirm(false)}>キャンセル</Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>

        {(task.tags.length > 0 || dueInfo) && (
          <Group gap={4} wrap="wrap">
            {task.tags.map((tag) => (
              <Badge key={tag} size="xs" variant="light" color="blue">{tag}</Badge>
            ))}
            {dueInfo && (
              <Badge
                size="xs"
                color={dueInfo.overdue ? 'red' : 'gray'}
                variant="light"
              >
                {dueInfo.days} Day
              </Badge>
            )}
          </Group>
        )}
      </Stack>
    </Paper>
  )
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

type ColumnProps = {
  status: TaskStatus
  tasks: Task[]
  projectId: string
  parentTaskId: string
  availableCPs?: Task[]
  onMoveToCheckpoint?: (taskId: string, cpId: string) => void
}

function KanbanColumn({ status, tasks, projectId, parentTaskId, availableCPs = [], onMoveToCheckpoint }: ColumnProps): JSX.Element {
  const { createTask, updateTask } = useData()
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (status !== 'todo') await updateTask(projectId, task.id, { status })
    setNewTitle(''); setShowForm(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setNewTitle(''); setShowForm(false) }
  }

  const columnTasks = tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order)

  return (
    <Paper
      shadow="none"
      p="sm"
      radius="md"
      style={{
        background: 'var(--mantine-color-dark-7)',
        border: `1px solid ${isOver ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-dark-5)'}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 200
      }}
      className={`kanban-column${isOver ? ' kanban-column--over' : ''}`}
    >
      <Group justify="space-between" mb="xs">
        <Badge size="sm" color={STATUS_COLORS[status]} variant="filled" style={{ textTransform: 'none' }}>
          {STATUS_LABELS[status]}
        </Badge>
        <Text size="xs" c="dimmed">{columnTasks.length}</Text>
      </Group>

      <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <Box ref={setDropRef} style={{ flex: 1 }}>
          {columnTasks.map((task) => (
            <KanbanCard key={task.id} task={task} projectId={projectId} availableCPs={availableCPs} onMoveToCheckpoint={onMoveToCheckpoint} />
          ))}
        </Box>
      </SortableContext>

      <Box mt="xs">
        {showForm ? (
          <Stack gap={4}>
            <TextInput
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="タスク名"
              size="xs"
            />
            <Group gap={4}>
              <Button size="xs" onClick={handleAdd}>追加</Button>
              <Button size="xs" variant="default" onClick={() => { setNewTitle(''); setShowForm(false) }}>キャンセル</Button>
            </Group>
          </Stack>
        ) : (
          <Button variant="subtle" size="xs" fullWidth onClick={() => setShowForm(true)}>
            ＋ タスクを追加
          </Button>
        )}
      </Box>
    </Paper>
  )
}

// ── CPKanbanSection ───────────────────────────────────────────────────────────

type CPSectionProps = {
  cp: Task
  projectId: string
  allTasks: Task[]
  otherCPs: Task[]
  onMoveToCheckpoint: (taskId: string, cpId: string) => Promise<void>
}

function CPKanbanSection({ cp, projectId, allTasks, otherCPs, onMoveToCheckpoint }: CPSectionProps): JSX.Element {
  const { updateTask } = useData()
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [showDueDateInput, setShowDueDateInput] = useState(false)
  const [inlineDueAt, setInlineDueAt] = useState(cp.dueAt ?? '')
  const dueDateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setInlineDueAt(cp.dueAt ?? '') }, [cp.dueAt])

  const openDueDatePicker = (): void => {
    setShowDueDateInput(true)
    setTimeout(() => { try { dueDateInputRef.current?.showPicker?.() } catch {} }, 50)
  }

  const handleDueDateChange = async (value: string): Promise<void> => {
    setShowDueDateInput(false)
    if (value === (cp.dueAt ?? '')) return
    await updateTask(projectId, cp.id, { dueAt: value || null })
  }

  const childTasks = allTasks.filter((t) => t.parentId === cp.id)
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
      const targetColumnTasks = childTasks.filter((t) => t.status === targetStatus).sort((a, b) => a.order - b.order)
      const newOrder = overTask ? targetColumnTasks.findIndex((t) => t.id === overId) : targetColumnTasks.length
      await updateTask(projectId, activeId, { status: targetStatus, order: newOrder < 0 ? targetColumnTasks.length : newOrder })
    } else if (!overIsColumn) {
      const columnTasks = childTasks.filter((t) => t.status === draggedTask.status).sort((a, b) => a.order - b.order)
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
      const newIndex = columnTasks.findIndex((t) => t.id === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      const reordered = arrayMove(columnTasks, oldIndex, newIndex)
      await Promise.all(reordered.map((t, i) => (t.order !== i ? updateTask(projectId, t.id, { order: i }) : null)).filter(Boolean))
    }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dueInfo = cp.dueAt
    ? (() => {
        const due = new Date(cp.dueAt); due.setHours(0, 0, 0, 0)
        const days = Math.round((due.getTime() - today.getTime()) / 86400000)
        return { days, overdue: days < 0 }
      })()
    : null

  return (
    <>
      {showDueDateInput && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 299 }}
          onMouseDown={() => handleDueDateChange(inlineDueAt)}
        />,
        document.body
      )}
    <Paper radius="md" withBorder p={0} style={{ overflow: 'hidden', borderColor: 'var(--mantine-color-dark-4)' }}>
    <Stack gap={0}>
      <Group gap={8} align="center" px="sm" py={6} style={{ borderBottom: '1px solid var(--mantine-color-dark-5)', background: 'var(--mantine-color-dark-7)' }}>
        <Group gap={5} align="center" style={{ background: 'color-mix(in srgb, var(--mantine-color-violet-9) 40%, transparent)', borderRadius: 4, padding: '3px 8px' }}>
          <IconFlag size={12} stroke={2} color="var(--mantine-color-violet-4)" style={{ display: 'block' }} />
          <Text size="xs" fw={800} c="violet.4" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>Phase</Text>
        </Group>
        <Text size="sm" fw={600}>{cp.title}</Text>
        <Popover
          opened={showDueDateInput}
          onClose={() => setShowDueDateInput(false)}
          withArrow
          position="bottom-start"
          shadow="md"
        >
          <Popover.Target>
            <span>
              {dueInfo ? (
                <Group gap={4} align="center" style={{ display: 'inline-flex', cursor: 'pointer' }} onClick={openDueDatePicker}>
                  <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {cp.dueAt!.replace(/-/g, '/').replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, '$1/$2/$3')}
                  </Text>
                  <Badge
                    size="sm"
                    color={dueInfo.overdue ? 'red' : 'gray'}
                    variant="light"
                  >
                    {dueInfo.days}d
                  </Badge>
                </Group>
              ) : (
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  px={4}
                  style={{ fontSize: 11, height: 20 }}
                  onClick={openDueDatePicker}
                >
                  + 期限
                </Button>
              )}
            </span>
          </Popover.Target>
          <Popover.Dropdown p={6}>
            <input
              ref={dueDateInputRef}
              type="date"
              value={inlineDueAt}
              className="task-due-date-input"
              onChange={(e) => {
                const v = e.target.value
                setInlineDueAt(v)
                if (v.length === 10 || v === '') handleDueDateChange(v)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDueDateChange(inlineDueAt)
                if (e.key === 'Escape') { setInlineDueAt(cp.dueAt ?? ''); setShowDueDateInput(false) }
              }}
            />
          </Popover.Dropdown>
        </Popover>
      </Group>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {ALL_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={childTasks}
              projectId={projectId}
              parentTaskId={cp.id}
              availableCPs={otherCPs}
              onMoveToCheckpoint={onMoveToCheckpoint}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <KanbanCard task={activeTask} projectId={projectId} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </Stack>
    </Paper>
    </>
  )
}

// ── KanbanView ────────────────────────────────────────────────────────────────

type Props = {
  projectId: string
  parentTaskId: string
}

export function KanbanView({ projectId, parentTaskId }: Props): JSX.Element {
  const { tasksByProject, updateTask, createCheckpoint, moveTaskToCheckpoint } = useData()
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [showAddCpForm, setShowAddCpForm] = useState(false)
  const [newCpTitle, setNewCpTitle] = useState('')
  const cpInputRef = useRef<HTMLInputElement>(null)

  const allTasks = tasksByProject[projectId] ?? []

  const checkpoints = allTasks
    .filter((t) => t.parentId === parentTaskId && t.isCheckpoint)
    .sort((a, b) => a.order - b.order)
  const hasCheckpoints = checkpoints.length > 0

  // Non-CP mode: flat task list
  const childTasks = allTasks.filter((t) => t.parentId === parentTaskId)
  const activeTask = activeDragId ? childTasks.find((t) => t.id === activeDragId) ?? null : null

  useEffect(() => {
    if (showAddCpForm) cpInputRef.current?.focus()
  }, [showAddCpForm])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleAddCp = async (): Promise<void> => {
    const title = newCpTitle.trim()
    if (!title) return
    await createCheckpoint(projectId, parentTaskId, title)
    setNewCpTitle('')
    setShowAddCpForm(false)
  }

  const handleAddCpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleAddCp()
    if (e.key === 'Escape') { setNewCpTitle(''); setShowAddCpForm(false) }
  }

  const handleMoveToCheckpoint = async (taskId: string, targetCpId: string): Promise<void> => {
    await moveTaskToCheckpoint(projectId, taskId, targetCpId)
  }

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
      const targetColumnTasks = childTasks.filter((t) => t.status === targetStatus).sort((a, b) => a.order - b.order)
      const newOrder = overTask ? targetColumnTasks.findIndex((t) => t.id === overId) : targetColumnTasks.length
      await updateTask(projectId, activeId, { status: targetStatus, order: newOrder < 0 ? targetColumnTasks.length : newOrder })
    } else if (!overIsColumn) {
      const columnTasks = childTasks.filter((t) => t.status === draggedTask.status).sort((a, b) => a.order - b.order)
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
      const newIndex = columnTasks.findIndex((t) => t.id === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      const reordered = arrayMove(columnTasks, oldIndex, newIndex)
      await Promise.all(reordered.map((t, i) => (t.order !== i ? updateTask(projectId, t.id, { order: i }) : null)).filter(Boolean))
    }
  }

  // Add CP form UI (shared between CP and non-CP modes)
  const addCpForm = showAddCpForm ? (
    <Group gap={4}>
      <TextInput
        ref={cpInputRef}
        value={newCpTitle}
        onChange={(e) => setNewCpTitle(e.target.value)}
        onKeyDown={handleAddCpKeyDown}
        placeholder="Phase名"
        size="xs"
        style={{ width: 160 }}
      />
      <Button size="xs" color="violet" onClick={handleAddCp}>追加</Button>
      <Button size="xs" variant="default" onClick={() => { setNewCpTitle(''); setShowAddCpForm(false) }}>キャンセル</Button>
    </Group>
  ) : (
    <Button size="xs" variant="subtle" color="violet" leftSection={<IconFlag size={10} />} onClick={() => setShowAddCpForm(true)}>
      Phaseを追加
    </Button>
  )

  if (hasCheckpoints) {
    return (
      <Stack gap="xs" px="md" pt="sm" pb="md">
        {checkpoints.map((cp) => (
          <CPKanbanSection
            key={cp.id}
            cp={cp}
            projectId={projectId}
            allTasks={allTasks}
            otherCPs={checkpoints.filter((c) => c.id !== cp.id)}
            onMoveToCheckpoint={handleMoveToCheckpoint}
          />
        ))}
        <Group justify="flex-start" px={4}>
          {addCpForm}
        </Group>
      </Stack>
    )
  }

  return (
    <Stack gap={0}>
      <Group justify="flex-end" mb="xs" px={4}>
        {addCpForm}
      </Group>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          {activeTask ? <KanbanCard task={activeTask} projectId={projectId} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </Stack>
  )
}
