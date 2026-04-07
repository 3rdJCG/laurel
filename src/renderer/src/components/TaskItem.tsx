import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Badge, Menu, Group, ActionIcon, UnstyledButton,
  TextInput, Button, Text, Popover, Stack
} from '@mantine/core'
import {
  IconGripVertical,
  IconChevronDown,
  IconChevronRight,
  IconCheck,
  IconX,
  IconPencil,
  IconTrash,
  IconPlus
} from '@tabler/icons-react'
import { useData } from '../context/DataContext'
import type { Task, TaskStatus } from '../types'

function getContrastColor(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const toLinear = (v: number): number => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return L > 0.179 ? '#1a1a1a' : '#ffffff'
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  'todo': 'To Do',
  'in-progress': 'WIP',
  'in-review': 'In Review',
  'done': 'Done'
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  'todo': 'gray',
  'in-progress': 'blue',
  'in-review': 'orange',
  'done': 'teal'
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newGenreName, setNewGenreName] = useState('')
  const [showAddGenreForm, setShowAddGenreForm] = useState(false)
  const [showSubtaskForm, setShowSubtaskForm] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')

  const [showTitleInput, setShowTitleInput] = useState(false)
  const [inlineTitleVal, setInlineTitleVal] = useState(task.title)
  const titleInputRef = useRef<HTMLInputElement>(null)



  const [showOccurredAtInput, setShowOccurredAtInput] = useState(false)
  const [inlineOccurredAt, setInlineOccurredAt] = useState(task.occurredAt ?? '')
  const occurredAtInputRef = useRef<HTMLInputElement>(null)

  const [showDueDateInput, setShowDueDateInput] = useState(false)
  const [inlineDueAt, setInlineDueAt] = useState(task.dueAt ?? '')
  const dueDateInputRef = useRef<HTMLInputElement>(null)

  const subtaskRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showTitleInput) { setInlineTitleVal(task.title); titleInputRef.current?.focus() }
  }, [showTitleInput, task.title])

  const openDueDatePicker = (): void => {
    setShowDueDateInput(true)
    setTimeout(() => { try { dueDateInputRef.current?.showPicker?.() } catch {} }, 50)
  }

  const openOccurredAtPicker = (): void => {
    setShowOccurredAtInput(true)
    setTimeout(() => { try { occurredAtInputRef.current?.showPicker?.() } catch {} }, 50)
  }
  useEffect(() => { if (showSubtaskForm) subtaskRef.current?.focus() }, [showSubtaskForm])
  useEffect(() => { setInlineDueAt(task.dueAt ?? '') }, [task.dueAt])
  useEffect(() => { setInlineOccurredAt(task.occurredAt ?? '') }, [task.occurredAt])

  const childTasks = allTasks.filter((t) => t.parentId === task.id).sort((a, b) => a.order - b.order)

  const descendantCount = (() => {
    const count = (id: string): number => {
      const children = allTasks.filter((t) => t.parentId === id)
      return children.reduce((sum, c) => sum + 1 + count(c.id), 0)
    }
    return count(task.id)
  })()

  const handleGenreSelect = async (genre: string | null): Promise<void> => {
    setShowAddGenreForm(false); setNewGenreName('')
    try { await updateTask(task.projectId, task.id, { genre }) } catch (err) { onSaveError?.(String(err)) }
  }

  const handleAddGenreSubmit = async (): Promise<void> => {
    const name = newGenreName.trim()
    if (!name) return
    await addGenre(name)
    await handleGenreSelect(name)
  }

  const handleStatusChange = async (status: TaskStatus): Promise<void> => {
    try { await updateTask(task.projectId, task.id, { status }) } catch (err) { onSaveError?.(String(err)) }
  }

  const handleTitleSave = async (): Promise<void> => {
    const title = inlineTitleVal.trim()
    setShowTitleInput(false)
    if (!title || title === task.title) return
    try { await updateTask(task.projectId, task.id, { title }) } catch (err) { onSaveError?.(String(err)) }
  }

  const handleOccurredAtChange = async (value: string): Promise<void> => {
    setShowOccurredAtInput(false)
    if (value === (task.occurredAt ?? '')) return
    try { await updateTask(task.projectId, task.id, { occurredAt: value || null }) } catch (err) { onSaveError?.(String(err)) }
  }

  const handleDueDateChange = async (value: string): Promise<void> => {
    setShowDueDateInput(false)
    if (value === (task.dueAt ?? '')) return
    try { await updateTask(task.projectId, task.id, { dueAt: value || null }) } catch (err) { onSaveError?.(String(err)) }
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    try { await deleteTask(task.projectId, task.id) } catch (err) { onSaveError?.(String(err)) }
    setShowDeleteConfirm(false)
  }

  const handleSubtaskCreate = async (): Promise<void> => {
    const title = subtaskTitle.trim()
    if (!title) return
    try { await createTask(task.projectId, task.id, title, task) } catch (err) { onSaveError?.(String(err)) }
    setSubtaskTitle(''); setShowSubtaskForm(false)
  }

  const handleSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSubtaskCreate()
    if (e.key === 'Escape') { setSubtaskTitle(''); setShowSubtaskForm(false) }
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
        if (reordered[i].order !== i) await updateTask(reordered[i].projectId, reordered[i].id, { order: i })
      }
    } catch (err) { onSaveError?.(String(err)) }
  }

  const isExpanded = expandedIds.has(task.id)
  const hasChildren = childTasks.length > 0

  // Genre badge
  const genreObj = genres.find((g) => g.name === task.genre)

  const anyDatePickerOpen = showDueDateInput || showOccurredAtInput

  return (
    <>
      {anyDatePickerOpen && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 299 }}
          onMouseDown={() => {
            if (showDueDateInput) handleDueDateChange(inlineDueAt)
            if (showOccurredAtInput) handleOccurredAtChange(inlineOccurredAt)
          }}
        />,
        document.body
      )}
    <div ref={setNodeRef} style={sortableStyle} className={`task-item task-item--depth-${depth}`}>
      <div className="task-row">
        {/* Drag handle */}
        <UnstyledButton
          className="drag-handle"
          {...attributes}
          {...listeners}
          aria-label="ドラッグ"
          style={{ cursor: 'grab', color: 'var(--mantine-color-dark-3)', padding: '0 4px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
        >
          <IconGripVertical size={14} stroke={1.5} />
        </UnstyledButton>

        {/* Expand/collapse */}
        {hasChildren ? (
          <ActionIcon variant="subtle" size="xs" onClick={() => onToggleExpand(task.id)} style={{ flexShrink: 0 }}>
            {isExpanded ? <IconChevronDown size={12} stroke={2} /> : <IconChevronRight size={12} stroke={2} />}
          </ActionIcon>
        ) : (
          <span className="expand-toggle-placeholder" />
        )}

        {/* Genre badge (root tasks only) */}
        <div className="task-genre-slot">
          {isRoot && (
            <Menu shadow="md" width={180} onClose={() => { setShowAddGenreForm(false); setNewGenreName('') }}>
              <Menu.Target>
                <UnstyledButton title="ジャンルを変更">
                  {task.genre ? (
                    <Badge
                      size="md"
                      style={{ backgroundColor: genreObj?.color, color: genreObj?.color ? getContrastColor(genreObj.color) : '#fff', cursor: 'pointer', textTransform: 'none', fontWeight: 700 }}
                    >
                      {task.genre}
                    </Badge>
                  ) : (
                    <Badge size="md" variant="outline" color="gray" style={{ cursor: 'pointer', textTransform: 'none' }}>＋</Badge>
                  )}
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => handleGenreSelect(null)}>
                  <Text size="xs" c="dimmed">なし</Text>
                </Menu.Item>
                {genres.map((g) => (
                  <Menu.Item
                    key={g.name}
                    onClick={() => handleGenreSelect(g.name)}
                    leftSection={<span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: g.color, display: 'inline-block' }} />}
                  >
                    <Text size="xs" fw={task.genre === g.name ? 700 : 400}>{g.name}</Text>
                  </Menu.Item>
                ))}
                <Menu.Divider />
                {showAddGenreForm ? (
                  <Group gap={4} px={8} py={4}>
                    <TextInput
                      size="xs"
                      value={newGenreName}
                      onChange={(e) => setNewGenreName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGenreSubmit() } }}
                      placeholder="ジャンル名"
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <ActionIcon size="xs" onClick={handleAddGenreSubmit}><IconCheck size={12} stroke={2} /></ActionIcon>
                    <ActionIcon size="xs" onClick={() => { setShowAddGenreForm(false); setNewGenreName('') }}><IconX size={12} stroke={2} /></ActionIcon>
                  </Group>
                ) : (
                  <Menu.Item onClick={() => setShowAddGenreForm(true)}>
                    <Text size="xs">+ 新しいジャンルを追加</Text>
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </div>

        {/* Title */}
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
            <button className="task-title task-title--link" onClick={() => onNavigate(task.id)}>{task.title}</button>
          ) : (
            <span className="task-title">{task.title}</span>
          )}
          {!showTitleInput && (
            <ActionIcon
              variant="subtle"
              size="xs"
              className="task-title-edit-btn"
              onClick={(e) => { e.stopPropagation(); setShowTitleInput(true) }}
              title="タイトルを編集"
            >
              <IconPencil size={12} stroke={1.5} />
            </ActionIcon>
          )}
        </div>

        {/* Status badge */}
        <Menu shadow="md" width={130}>
          <Menu.Target>
            <Badge
              size="md"
              color={STATUS_COLORS[task.status]}
              variant="filled"
              style={{ cursor: 'pointer', flexShrink: 0, textTransform: 'none' }}
            >
              {STATUS_LABELS[task.status]}
            </Badge>
          </Menu.Target>
          <Menu.Dropdown>
            {ALL_STATUSES.map((s) => (
              <Menu.Item key={s} onClick={() => handleStatusChange(s)}>
                <Badge size="sm" color={STATUS_COLORS[s]} variant="filled" fw={task.status === s ? 700 : 400} style={{ textTransform: 'none' }}>
                  {STATUS_LABELS[s]}
                </Badge>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>

        {/* Due date */}
        <span className="task-due-date">
          <Popover
            opened={showDueDateInput}
            onClose={() => setShowDueDateInput(false)}
            withArrow
            position="bottom-end"
            shadow="md"
          >
            <Popover.Target>
              <span>
                {task.dueAt ? (() => {
                  const today = new Date(); today.setHours(0, 0, 0, 0)
                  const due = new Date(task.dueAt!); due.setHours(0, 0, 0, 0)
                  const days = Math.round((due.getTime() - today.getTime()) / 86400000)
                  const isOverdue = days < 0
                  return (
                    <Badge
                      size="sm"
                      color={isOverdue ? 'red' : 'gray'}
                      variant="filled"
                      style={{ cursor: 'pointer', textTransform: 'none' }}
                      onClick={openDueDatePicker}
                      title={task.dueAt!}
                    >
                      {days} day
                    </Badge>
                  )
                })() : (
                  <UnstyledButton
                    className="task-date-add"
                    onClick={openDueDatePicker}
                    style={{ fontSize: 11, color: 'var(--mantine-color-dark-3)' }}
                  >
                    + 期限
                  </UnstyledButton>
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
                  if (e.key === 'Escape') { setInlineDueAt(task.dueAt ?? ''); setShowDueDateInput(false) }
                }}
              />
            </Popover.Dropdown>
          </Popover>
        </span>

        {/* Occurred at */}
        <span className="task-occurred-at">
          <Popover
            opened={showOccurredAtInput}
            onClose={() => setShowOccurredAtInput(false)}
            withArrow
            position="bottom-end"
            shadow="md"
          >
            <Popover.Target>
              <span>
                {task.occurredAt ? (() => {
                  const occ = new Date(task.occurredAt!)
                  const label = `${occ.getFullYear()}/${occ.getMonth() + 1}/${occ.getDate()}`
                  return (
                    <UnstyledButton
                      onClick={openOccurredAtPicker}
                      title={task.occurredAt!}
                      style={{ fontSize: 11, color: 'var(--mantine-color-dark-3)', whiteSpace: 'nowrap' }}
                    >
                      {label}
                    </UnstyledButton>
                  )
                })() : (
                  <UnstyledButton
                    className="task-date-add task-date-add--ghost"
                    onClick={openOccurredAtPicker}
                    style={{ fontSize: 11, color: 'var(--mantine-color-dark-3)' }}
                  >
                    + 発生日
                  </UnstyledButton>
                )}
              </span>
            </Popover.Target>
            <Popover.Dropdown p={6}>
              <input
                ref={occurredAtInputRef}
                type="date"
                value={inlineOccurredAt}
                className="task-due-date-input"
                onChange={(e) => {
                  const v = e.target.value
                  setInlineOccurredAt(v)
                  if (v.length === 10 || v === '') handleOccurredAtChange(v)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleOccurredAtChange(inlineOccurredAt)
                  if (e.key === 'Escape') { setInlineOccurredAt(task.occurredAt ?? ''); setShowOccurredAtInput(false) }
                }}
              />
            </Popover.Dropdown>
          </Popover>
        </span>

        {/* Actions */}
        <div className="task-actions">
          {isRoot && (
            <ActionIcon variant="subtle" size="xs" onClick={() => setShowSubtaskForm(true)} title="サブタスクを追加">
              <IconPlus size={12} stroke={2} />
            </ActionIcon>
          )}
          <Popover opened={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} withArrow shadow="md">
            <Popover.Target>
              <ActionIcon variant="subtle" size="xs" color="red" onClick={() => setShowDeleteConfirm(true)} title="削除">
                <IconTrash size={12} stroke={1.5} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs">
                <Text size="xs">
                  {descendantCount > 0
                    ? `このタスクと子タスク ${descendantCount} 件を削除しますか？`
                    : 'このタスクを削除しますか？'}
                </Text>
                <Group gap="xs">
                  <Button size="xs" color="red" onClick={handleDeleteConfirm}>削除</Button>
                  <Button size="xs" variant="default" onClick={() => setShowDeleteConfirm(false)}>キャンセル</Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </div>
      </div>

      {showSubtaskForm && (
        <div className="subtask-form" style={{ marginLeft: depth * 12 + 12 }}>
          <Group gap="xs">
            <input
              ref={subtaskRef}
              type="text"
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              onKeyDown={handleSubtaskKeyDown}
              placeholder="サブタスク名"
              className="task-tag-input"
              style={{ flex: 1 }}
            />
            <Button size="xs" onClick={handleSubtaskCreate}>追加</Button>
            <Button size="xs" variant="default" onClick={() => { setSubtaskTitle(''); setShowSubtaskForm(false) }}>キャンセル</Button>
          </Group>
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
    </>
  )
}
