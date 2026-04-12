import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Stack, Group, Text, Title, TextInput, Button, ActionIcon,
  Card, Box, Loader, Center, Badge
} from '@mantine/core'
import { IconPencil, IconTrash, IconGripVertical, IconAlertTriangle, IconClock, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import {
  DndContext, DragOverlay,
  pointerWithin, type DragEndEvent, type DragStartEvent,
  PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { notifications } from '@mantine/notifications'
import { useData } from '../context/DataContext'
import { ErrorBanner } from '../components/ErrorBanner'
import { ForgeTodayArea, MailCardContent, type ForgeMail } from '../components/ForgeTodayArea'
import type { Project, Task } from '../types'

// ── Reminder Section ─────────────────────────────────────────────────────────

type ReminderTask = Task & { projectName: string }
type ReminderCategory = 'overdue' | 'today' | 'upcoming'

function categorizeByDue(dueAt: string, todayStr: string): ReminderCategory | null {
  if (dueAt < todayStr) return 'overdue'
  if (dueAt === todayStr) return 'today'
  const due = new Date(dueAt + 'T00:00:00')
  const today = new Date(todayStr + 'T00:00:00')
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays >= 1 && diffDays <= 7) return 'upcoming'
  return null
}

function formatDueLabel(dueAt: string, todayStr: string): string {
  if (dueAt === todayStr) return '今日'
  const due = new Date(dueAt + 'T00:00:00')
  const today = new Date(todayStr + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `${Math.abs(diffDays)}日超過`
  return `あと${diffDays}日`
}

const categoryMeta: Record<ReminderCategory, { label: string; color: string; icon: typeof IconAlertTriangle }> = {
  overdue: { label: '期限超過', color: 'red', icon: IconAlertTriangle },
  today: { label: '今日が期限', color: 'orange', icon: IconClock },
  upcoming: { label: '近日期限', color: 'yellow', icon: IconClock },
}

function ReminderSection({
  tasks,
  onNavigateToProject
}: {
  tasks: ReminderTask[]
  onNavigateToProject: (projectId: string) => void
}): JSX.Element | null {
  const [expanded, setExpanded] = useState(true)

  if (tasks.length === 0) return null

  const todayStr = new Date().toISOString().slice(0, 10)

  // Count per category for header badges
  const counts: Record<ReminderCategory, number> = { overdue: 0, today: 0, upcoming: 0 }
  for (const t of tasks) {
    const cat = categorizeByDue(t.dueAt!, todayStr)
    if (cat) counts[cat]++
  }

  // Group by category, maintaining sort order
  const groups: { category: ReminderCategory; items: ReminderTask[] }[] = []
  let currentCat: ReminderCategory | null = null
  for (const t of tasks) {
    const cat = categorizeByDue(t.dueAt!, todayStr)!
    if (cat !== currentCat) {
      groups.push({ category: cat, items: [] })
      currentCat = cat
    }
    groups[groups.length - 1].items.push(t)
  }

  return (
    <Box mt="sm">
      {/* Collapsible header */}
      <Group
        gap={8}
        mb={expanded ? 6 : 0}
        onClick={() => setExpanded((v) => !v)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {expanded
          ? <IconChevronDown size={16} stroke={1.5} />
          : <IconChevronRight size={16} stroke={1.5} />
        }
        <Title order={5} style={{ lineHeight: 1 }}>リマインダー</Title>
        {/* Summary badges — always visible */}
        {counts.overdue > 0 && <Badge size="xs" variant="filled" color="red">{counts.overdue}</Badge>}
        {counts.today > 0 && <Badge size="xs" variant="filled" color="orange">{counts.today}</Badge>}
        {counts.upcoming > 0 && <Badge size="xs" variant="filled" color="yellow">{counts.upcoming}</Badge>}
      </Group>

      {expanded && (
        <Box style={{ maxHeight: 260, overflowY: 'auto' }}>
          <Stack gap={4}>
            {groups.map((group) => {
              const meta = categoryMeta[group.category]
              const Icon = meta.icon
              return (
                <Box key={group.category}>
                  <Group gap={6} mb={4}>
                    <Icon size={14} color={`var(--mantine-color-${meta.color}-5)`} />
                    <Text size="xs" fw={600} c={`${meta.color}.5`}>{meta.label}</Text>
                    <Badge size="xs" variant="filled" color={meta.color}>{group.items.length}</Badge>
                  </Group>
                  <Stack gap={2} ml={20}>
                    {group.items.map((task) => (
                      <Box
                        key={task.id}
                        onClick={() => onNavigateToProject(task.projectId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '4px 8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          borderLeft: `3px solid var(--mantine-color-${meta.color}-6)`,
                          backgroundColor: `color-mix(in srgb, var(--mantine-color-${meta.color}-9) 15%, transparent)`,
                        }}
                        className="reminder-row"
                      >
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0, width: 70 }}>
                          {formatDueLabel(task.dueAt!, todayStr)}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0, width: 100 }} truncate>
                          {task.projectName}
                        </Text>
                        <Text size="xs" style={{ flex: 1, minWidth: 0 }} truncate>
                          {task.title}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

// ── Sortable + droppable project card ─────────────────────────────────────────

type SortableProjectCardProps = {
  project: Project
  taskCount: number
  isDraggingMail: boolean
  isEditing: boolean
  isDeleting: boolean
  editName: string
  editRef: React.RefObject<HTMLInputElement>
  onEditNameChange: (v: string) => void
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onEditConfirm: () => void
  onEditCancel: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
  onStartEdit: () => void
  onStartDelete: () => void
  onNavigate: () => void
}

function SortableProjectCard({
  project, taskCount, isDraggingMail,
  isEditing, isDeleting,
  editName, editRef, onEditNameChange, onEditKeyDown, onEditConfirm, onEditCancel,
  onDeleteConfirm, onDeleteCancel,
  onStartEdit, onStartDelete, onNavigate
}: SortableProjectCardProps): JSX.Element {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging, isOver
  } = useSortable({ id: `project-${project.id}`, disabled: isDraggingMail })

  const highlight = isDraggingMail && isOver

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <Card
        padding="sm"
        radius="md"
        withBorder
        style={{
          cursor: isEditing || isDeleting ? 'default' : 'pointer',
          borderColor: highlight ? 'var(--mantine-color-blue-5)' : undefined,
          background: highlight ? 'var(--mantine-color-blue-9)' : undefined,
          transition: 'border-color 0.1s, background 0.1s',
          outline: highlight ? '2px solid var(--mantine-color-blue-5)' : 'none',
          outlineOffset: 1
        }}
      >
        {isEditing ? (
          <Group gap="xs">
            <TextInput
              ref={editRef}
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={onEditKeyDown}
              size="xs"
              style={{ flex: 1 }}
            />
            <Button size="xs" onClick={onEditConfirm}>確定</Button>
            <Button size="xs" variant="default" onClick={onEditCancel}>キャンセル</Button>
          </Group>
        ) : isDeleting ? (
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" style={{ flex: 1 }}>
              「{project.name}」とタスク {taskCount} 件を削除しますか？
            </Text>
            <Button size="xs" color="red" onClick={onDeleteConfirm}>削除</Button>
            <Button size="xs" variant="default" onClick={onDeleteCancel}>キャンセル</Button>
          </Group>
        ) : (
          <Group justify="space-between" onClick={onNavigate}>
            <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
              <ActionIcon
                variant="subtle" size="sm" color="dimmed"
                {...attributes} {...listeners}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: isDragging ? 'grabbing' : 'grab', flexShrink: 0 }}
              >
                <IconGripVertical size={14} stroke={1.5} />
              </ActionIcon>
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={500}>{project.name}</Text>
                <Text size="xs" c="dimmed">{taskCount} タスク</Text>
              </div>
            </Group>
            <Group gap={4} onClick={(e) => e.stopPropagation()}>
              <ActionIcon variant="subtle" size="sm" onClick={onStartEdit} title="名前を編集">
                <IconPencil size={14} stroke={1.5} />
              </ActionIcon>
              <ActionIcon variant="subtle" size="sm" color="red" onClick={onStartDelete} title="削除">
                <IconTrash size={14} stroke={1.5} />
              </ActionIcon>
            </Group>
          </Group>
        )}
      </Card>
    </Box>
  )
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

type Props = {
  onNavigateToProject: (projectId: string) => void
  onNavigateToSettings?: () => void
}

export function HomeScreen({ onNavigateToProject, onNavigateToSettings }: Props): JSX.Element {
  const { projects, tasksByProject, isLoading, error, loadErrors, dismissLoadErrors, createProject, updateProject, deleteProject, reorderProjects, createTask } = useData()

  // Project UI state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  // Forge Today state
  const [mails, setMails] = useState<ForgeMail[]>([])
  const [mailFolder, setMailFolder] = useState('')
  const [forgeLoaded, setForgeLoaded] = useState(false)
  const [currentMailIndex, setCurrentMailIndex] = useState(0)
  const [isDraggingMail, setIsDraggingMail] = useState(false)
  const ctrlHeldRef = useRef(false)
  const mailsRef = useRef<ForgeMail[]>([])
  const currentMailIndexRef = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // ── Project handlers ────────────────────────────────────────────────────────

  useEffect(() => {
    if (showAddForm) inputRef.current?.focus()
  }, [showAddForm])

  useEffect(() => {
    if (editingProjectId) editRef.current?.focus()
  }, [editingProjectId])

  const handleAddConfirm = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    await createProject(name)
    setNewName('')
    setShowAddForm(false)
  }

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleAddConfirm()
    if (e.key === 'Escape') { setNewName(''); setShowAddForm(false) }
  }

  const startEdit = (project: Project): void => {
    setEditingProjectId(project.id)
    setEditName(project.name)
  }

  const handleEditConfirm = async (): Promise<void> => {
    const name = editName.trim()
    if (!name || !editingProjectId) return
    await updateProject(editingProjectId, { name })
    setEditingProjectId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleEditConfirm()
    if (e.key === 'Escape') setEditingProjectId(null)
  }

  const handleDeleteConfirm = async (projectId: string): Promise<void> => {
    await deleteProject(projectId)
    setDeletingProjectId(null)
  }

  // ── Forge Today handlers ────────────────────────────────────────────────────

  const loadMails = useCallback(async () => {
    const settings = (await window.api.invoke('settings:get')) as { mailFolder?: string }
    const folder = settings.mailFolder ?? ''
    setMailFolder(folder)
    if (!folder) {
      setMails([])
      mailsRef.current = []
      setForgeLoaded(true)
      return
    }
    const result = (await window.api.invoke('forge:load-mails')) as ForgeMail[]
    setMails(result)
    mailsRef.current = result
    setCurrentMailIndex((prev) => {
      const next = result.length === 0 ? 0 : Math.min(prev, result.length - 1)
      currentMailIndexRef.current = next
      return next
    })
    setForgeLoaded(true)
  }, [])

  useEffect(() => { loadMails() }, [loadMails])

  useEffect(() => {
    const down = (e: KeyboardEvent): void => { if (e.key === 'Control') ctrlHeldRef.current = true }
    const up = (e: KeyboardEvent): void => { if (e.key === 'Control') ctrlHeldRef.current = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const markProcessed = useCallback(async (mailId: string) => {
    await window.api.invoke('forge:mark-processed', { id: mailId })
    await loadMails()
  }, [loadMails])

  const handleDragStart = (event: DragStartEvent): void => {
    if (event.active.id === 'forge-mail-card') {
      setIsDraggingMail(true)
    }
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (isDraggingMail) {
      setIsDraggingMail(false)
      if (!over) return
      const currentMail = mailsRef.current[currentMailIndexRef.current]
      if (!currentMail) return
      const isCtrl = ctrlHeldRef.current
      const overId = String(over.id)
      const run = async (): Promise<void> => {
        try {
          if (overId === 'trash') {
            await markProcessed(currentMail.id)
            return
          }
          if (overId.startsWith('project-')) {
            const projectId = overId.replace('project-', '')
            const mail = currentMail.data.mail
            await createTask(projectId, null, mail.subject, null, { mailData: mail })
            notifications.show({ title: 'タスクを作成しました', message: mail.subject, color: 'blue', autoClose: 3000 })
            if (!isCtrl) await markProcessed(currentMail.id)
          }
        } catch (err) {
          notifications.show({ title: 'エラー', message: String(err), color: 'red', autoClose: 5000 })
        }
      }
      run()
    } else {
      // Project sort drag
      if (!over || active.id === over.id) return
      const oldIndex = projects.findIndex((p) => `project-${p.id}` === active.id)
      const newIndex = projects.findIndex((p) => `project-${p.id}` === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const next = arrayMove(projects, oldIndex, newIndex)
      reorderProjects(next.map((p) => p.id))
    }
  }

  const handleMailPrev = (): void => {
    const next = Math.max(0, currentMailIndex - 1)
    setCurrentMailIndex(next)
    currentMailIndexRef.current = next
  }
  const handleMailNext = (): void => {
    const next = Math.min(mails.length - 1, currentMailIndex + 1)
    setCurrentMailIndex(next)
    currentMailIndexRef.current = next
  }

  // ── Reminder tasks ──────────────────────────────────────────────────────────

  const reminderTasks = useMemo((): ReminderTask[] => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const projectMap = new Map(projects.map((p) => [p.id, p.name]))
    const all: ReminderTask[] = []

    for (const [projectId, tasks] of Object.entries(tasksByProject)) {
      for (const t of tasks) {
        if (!t.dueAt || t.status === 'done') continue
        const cat = categorizeByDue(t.dueAt, todayStr)
        if (cat === null) continue
        all.push({ ...t, projectName: projectMap.get(projectId) ?? '' })
      }
    }

    // Sort: overdue first (ascending = most overdue first), then today, then upcoming
    const catOrder: Record<ReminderCategory, number> = { overdue: 0, today: 1, upcoming: 2 }
    all.sort((a, b) => {
      const catA = categorizeByDue(a.dueAt!, todayStr)!
      const catB = categorizeByDue(b.dueAt!, todayStr)!
      if (catA !== catB) return catOrder[catA] - catOrder[catB]
      return a.dueAt! < b.dueAt! ? -1 : a.dueAt! > b.dueAt! ? 1 : 0
    })

    return all
  }, [projects, tasksByProject])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    )
  }

  if (error) {
    return (
      <Center h="100%">
        <Text c="red" size="sm">データの読み込みに失敗しました: {error}</Text>
      </Center>
    )
  }

  const currentDragMail = mailsRef.current[currentMailIndexRef.current] ?? null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Error banners */}
        {loadErrors.map((e) => (
          <ErrorBanner
            key={e.filePath}
            level="warning"
            message={`ファイルの読み込みをスキップしました: ${e.filePath} — ${e.message}`}
            filePath={e.filePath}
            onClose={dismissLoadErrors}
          />
        ))}

        {/* Two-column layout */}
        <Box style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, alignItems: 'flex-start' }}>

          {/* Left: Project list */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" align="center" mb="xs">
              <Title order={4}>プロジェクト</Title>
              {!showAddForm && (
                <Button size="xs" variant="light" onClick={() => setShowAddForm(true)}>
                  ＋ 新規プロジェクト
                </Button>
              )}
            </Group>

            {projects.length === 0 && !showAddForm && (
              <Text c="dimmed" size="sm">プロジェクトはまだありません</Text>
            )}

            <SortableContext
              items={projects.map((p) => `project-${p.id}`)}
              strategy={verticalListSortingStrategy}
            >
            <Stack gap="xs">
              {projects.map((project: Project) => {
                const taskCount = (tasksByProject[project.id] ?? []).length
                return (
                  <SortableProjectCard
                    key={project.id}
                    project={project}
                    taskCount={taskCount}
                    isDraggingMail={isDraggingMail}
                    isEditing={editingProjectId === project.id}
                    isDeleting={deletingProjectId === project.id}
                    editName={editName}
                    editRef={editRef}
                    onEditNameChange={setEditName}
                    onEditKeyDown={handleEditKeyDown}
                    onEditConfirm={handleEditConfirm}
                    onEditCancel={() => setEditingProjectId(null)}
                    onDeleteConfirm={() => handleDeleteConfirm(project.id)}
                    onDeleteCancel={() => setDeletingProjectId(null)}
                    onStartEdit={() => startEdit(project)}
                    onStartDelete={() => setDeletingProjectId(project.id)}
                    onNavigate={() => onNavigateToProject(project.id)}
                  />
                )
              })}

              {showAddForm && (
                <Card padding="sm" radius="md" withBorder>
                  <Group gap="xs">
                    <TextInput
                      ref={inputRef}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={handleAddKeyDown}
                      placeholder="プロジェクト名"
                      size="xs"
                      style={{ flex: 1 }}
                    />
                    <Button size="xs" onClick={handleAddConfirm}>追加</Button>
                    <Button size="xs" variant="default" onClick={() => { setNewName(''); setShowAddForm(false) }}>キャンセル</Button>
                  </Group>
                </Card>
              )}
            </Stack>
            </SortableContext>
          </Box>

          {/* Right: Forge Today + Reminder */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <ForgeTodayArea
              mails={mails}
              mailFolder={mailFolder}
              loaded={forgeLoaded}
              currentIndex={currentMailIndex}
              isDraggingMail={isDraggingMail}
              onPrev={handleMailPrev}
              onNext={handleMailNext}
              onRefresh={loadMails}
              onNavigateToSettings={onNavigateToSettings}
            />
            <ReminderSection tasks={reminderTasks} onNavigateToProject={onNavigateToProject} />
          </Box>
        </Box>
      </Box>

      {/* Drag overlay — follows cursor */}
      <DragOverlay dropAnimation={null}>
        {isDraggingMail && currentDragMail ? (
          <Box style={{ width: 260, pointerEvents: 'none', opacity: 0.92 }}>
            <MailCardContent mail={currentDragMail} />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
