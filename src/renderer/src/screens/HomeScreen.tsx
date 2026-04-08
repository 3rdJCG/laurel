import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Stack, Group, Text, Title, TextInput, Button, ActionIcon,
  Card, Box, Loader, Center
} from '@mantine/core'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import {
  DndContext, DragOverlay, useDroppable,
  pointerWithin, type DragEndEvent,
  PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import { notifications } from '@mantine/notifications'
import { useData } from '../context/DataContext'
import { ErrorBanner } from '../components/ErrorBanner'
import { ForgeTodayArea, MailCardContent, type ForgeMail } from '../components/ForgeTodayArea'
import type { Project } from '../types'

// ── Droppable project card ────────────────────────────────────────────────────

type DroppableProjectCardProps = {
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

function DroppableProjectCard({
  project, taskCount, isDraggingMail,
  isEditing, isDeleting,
  editName, editRef, onEditNameChange, onEditKeyDown, onEditConfirm, onEditCancel,
  onDeleteConfirm, onDeleteCancel,
  onStartEdit, onStartDelete, onNavigate
}: DroppableProjectCardProps): JSX.Element {
  const { isOver, setNodeRef } = useDroppable({ id: `project-${project.id}` })

  const highlight = isDraggingMail && isOver

  return (
    <Box ref={setNodeRef}>
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
            <div>
              <Text size="sm" fw={500}>{project.name}</Text>
              <Text size="xs" c="dimmed">{taskCount} タスク</Text>
            </div>
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
  const { projects, tasksByProject, isLoading, error, loadErrors, dismissLoadErrors, createProject, updateProject, deleteProject, createTask, updateTask } = useData()

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

  const handleDragStart = (): void => {
    setIsDraggingMail(true)
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    setIsDraggingMail(false)
    const { over } = event
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
          notifications.show({
            title: 'タスクを作成しました',
            message: mail.subject,
            color: 'blue',
            autoClose: 3000
          })
          if (!isCtrl) {
            await markProcessed(currentMail.id)
          }
        }
      } catch (err) {
        notifications.show({
          title: 'エラー',
          message: String(err),
          color: 'red',
          autoClose: 5000
        })
      }
    }
    run()
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

            <Stack gap="xs">
              {projects.map((project: Project) => {
                const taskCount = (tasksByProject[project.id] ?? []).length
                return (
                  <DroppableProjectCard
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
          </Box>

          {/* Right: Forge Today */}
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
