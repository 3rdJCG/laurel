import { useState, useRef, useEffect, useMemo } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import {
  Tabs, Box, Group, Title, Button, Text, TextInput,
  Checkbox, Stack, Menu, UnstyledButton, ActionIcon
} from '@mantine/core'
import { IconCopy, IconClipboard, IconX } from '@tabler/icons-react'
import { useData } from '../context/DataContext'
import { useBackHandler } from '../context/BackHandlerContext'
import { TaskItem } from '../components/TaskItem'
import { IssuesTab } from '../components/IssuesTab'
import { GanttView } from '../components/GanttView'
import { ErrorBanner } from '../components/ErrorBanner'
import type { Task } from '../types'

type Props = {
  projectId: string
  initialTab?: string
  onNavigateHome: () => void
  onNavigateToTask: (projectId: string, taskId: string, fromTab?: string) => void
}

function filterTasksByVisibility(tasks: Task[], showCompleted: boolean): Task[] {
  if (showCompleted) return tasks
  const hiddenIds = new Set<string>()
  const markHidden = (id: string): void => {
    hiddenIds.add(id)
    tasks.filter((t) => t.parentId === id).forEach((t) => markHidden(t.id))
  }
  tasks.filter((t) => t.status === 'done').forEach((t) => markHidden(t.id))
  return tasks.filter((t) => !hiddenIds.has(t.id))
}

export function ProjectScreen({ projectId, initialTab, onNavigateToTask }: Props): JSX.Element {
  const { projects, tasksByProject, createTask, duplicateTaskTreeBulk, deleteTasksBulk, updateTask, saveProjectData, genres, updateGenres, moveTasksToCheckpointBulk } = useData()
  const [activeTab, setActiveTab] = useState<string>(initialTab ?? 'tasks')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`laurel:expand:${projectId}`)
    return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>()
  })
  const [showCompletedTasks, setShowCompletedTasks] = useState(true)
  const [showAddRootForm, setShowAddRootForm] = useState(false)
  const [rootTaskTitle, setRootTaskTitle] = useState('')
  const [filterGenre, setFilterGenre] = useState<string | null>(null)
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [clipboardIds, setClipboardIds] = useState<string[]>([])
  const rootInputRef = useRef<HTMLInputElement>(null)

  const project = projects.find((p) => p.id === projectId)
  const allTasks = tasksByProject[projectId] ?? []

  useEffect(() => {
    setActiveTab(initialTab ?? 'tasks')
    setFilterGenre(null)
    setFilterTags([])
    const saved = localStorage.getItem(`laurel:expand:${projectId}`)
    setExpandedIds(saved ? new Set<string>(JSON.parse(saved)) : new Set<string>())
  }, [projectId, initialTab])

  // Gantt/Issues タブから戻る → Tasks タブへ
  useBackHandler(activeTab !== 'tasks', () => {
    setActiveTab('tasks')
  })

  const handleToggleExpand = (taskId: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      localStorage.setItem(`laurel:expand:${projectId}`, JSON.stringify([...next]))
      return next
    })
  }

  const availableGenres = useMemo(() => {
    const genres = new Set<string>()
    allTasks.forEach((t) => { if (t.genre) genres.add(t.genre) })
    return [...genres].sort()
  }, [allTasks])

useEffect(() => {
    if (showAddRootForm) rootInputRef.current?.focus()
  }, [showAddRootForm])

  const handleAddRootTask = async (): Promise<void> => {
    const title = rootTaskTitle.trim()
    if (!title) return
    try {
      await createTask(projectId, null, title)
      setSaveError(null)
    } catch (err) {
      setSaveError(String(err))
    }
    setRootTaskTitle('')
    setShowAddRootForm(false)
  }

  const handleSelect = (taskId: string, selected: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }

  const handleCopy = (): void => {
    setClipboardIds([...selectedIds])
    setSelectedIds(new Set())
  }

  const handleDeleteSelected = async (): Promise<void> => {
    try {
      await deleteTasksBulk(projectId, [...selectedIds])
      setSelectedIds(new Set())
      setSaveError(null)
    } catch (err) {
      setSaveError(String(err))
    }
  }

  const handleMoveToPhase = async (phaseId: string): Promise<void> => {
    try {
      await moveTasksToCheckpointBulk(projectId, [...selectedIds], phaseId)
      setSelectedIds(new Set())
      setSaveError(null)
    } catch (err) {
      setSaveError(String(err))
    }
  }

  const handlePaste = async (parentId: string | null): Promise<void> => {
    if (clipboardIds.length === 0) return
    try {
      await duplicateTaskTreeBulk(projectId, clipboardIds, parentId)
      setClipboardIds([])
      setSaveError(null)
    } catch (err) {
      setSaveError(String(err))
    }
  }

  const handleRetry = async (): Promise<void> => {
    try {
      await saveProjectData(projectId)
      setSaveError(null)
    } catch (err) {
      setSaveError(String(err))
    }
  }

  const handleRootDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const currentRootTasks = (tasksByProject[projectId] ?? [])
      .filter((t) => t.parentId === null)
      .sort((a, b) => a.order - b.order)
    const oldIndex = currentRootTasks.findIndex((t) => t.id === active.id)
    const newIndex = currentRootTasks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(currentRootTasks, oldIndex, newIndex)
    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].order !== i) {
          await updateTask(projectId, reordered[i].id, { order: i })
        }
      }
    } catch (err) {
      setSaveError(String(err))
    }
  }

  const handleRootKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleAddRootTask()
    if (e.key === 'Escape') { setRootTaskTitle(''); setShowAddRootForm(false) }
  }

  const filteredTasks = useMemo(() => {
    let tasks = filterTasksByVisibility(allTasks, showCompletedTasks)
    if (filterGenre) tasks = tasks.filter((t) => t.genre === filterGenre)
    if (filterTags.length > 0) tasks = tasks.filter((t) => filterTags.every((tag) => t.tags.includes(tag)))
    return tasks
  }, [allTasks, showCompletedTasks, filterGenre, filterTags])

  const rootTasks = filteredTasks
    .filter((t: Task) => t.parentId === null)
    .sort((a: Task, b: Task) => a.order - b.order)

  if (!project) {
    return (
      <Box p="md">
        <Text c="dimmed" size="sm">プロジェクトが見つかりません</Text>
      </Box>
    )
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box px="md" pt="md" pb={0}>
        <Title order={4} mb="xs">{project.name}</Title>
      </Box>

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'tasks')} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Box px="md">
          <Tabs.List>
            <Tabs.Tab value="tasks">Tasks</Tabs.Tab>
            <Tabs.Tab value="gantt">Gantt</Tabs.Tab>
            <Tabs.Tab value="issues">Issues</Tabs.Tab>
          </Tabs.List>
        </Box>

        <Tabs.Panel value="issues" style={{ flex: 1, overflow: 'auto' }}>
          <IssuesTab projectId={projectId} />
        </Tabs.Panel>

        <Tabs.Panel value="gantt" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <GanttView
            tasks={allTasks}
            genres={genres}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            onNavigate={(taskId) => onNavigateToTask(projectId, taskId, 'gantt')}
            onUpdateTask={updateTask}
            onReorderGenres={(reordered) => {
              updateGenres(reordered)
              window.api.invoke('settings:genres-set', reordered)
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="tasks" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
            {saveError && (
              <Box px="md" pt="xs">
                <ErrorBanner
                  level="critical"
                  message={`保存に失敗しました: ${saveError}`}
                  onClose={() => setSaveError(null)}
                  onRetry={handleRetry}
                />
              </Box>
            )}

            {/* Toolbar */}
            <Box px="md" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
              <Group gap="sm" wrap="wrap">
                {selectedIds.size > 0 && (
                  <Group gap={6}>
                    <Text size="xs" c="dimmed">{selectedIds.size}件選択中</Text>
                    <Button size="xs" leftSection={<IconCopy size={12} />} onClick={handleCopy}>コピー</Button>
                    <Button size="xs" color="red" variant="light" onClick={handleDeleteSelected}>削除</Button>
                    <ActionIcon size="xs" variant="subtle" onClick={() => setSelectedIds(new Set())} title="選択解除">
                      <IconX size={12} />
                    </ActionIcon>
                  </Group>
                )}
                {clipboardIds.length > 0 && selectedIds.size === 0 && (
                  <Group gap={6}>
                    <Text size="xs" c="dimmed">{clipboardIds.length}件コピー済み</Text>
                    <Button size="xs" leftSection={<IconClipboard size={12} />} onClick={() => handlePaste(null)}>ルートに追加</Button>
                    <ActionIcon size="xs" variant="subtle" onClick={() => setClipboardIds([])} title="クリア">
                      <IconX size={12} />
                    </ActionIcon>
                  </Group>
                )}
                {availableGenres.length > 0 && (
                  <Menu shadow="md" width={180}>
                    <Menu.Target>
                      <UnstyledButton
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '2px 8px', borderRadius: 4,
                          border: '1px solid var(--mantine-color-dark-4)',
                          fontSize: 12, color: 'var(--mantine-color-dark-1)'
                        }}
                      >
                        {filterGenre ? (
                          <>
                            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: genres.find((g) => g.name === filterGenre)?.color ?? '#6b7280', display: 'inline-block', flexShrink: 0 }} />
                            <span>{filterGenre}</span>
                          </>
                        ) : (
                          <Text size="xs" c="dimmed">すべてのジャンル</Text>
                        )}
                        <Text size="xs" c="dimmed" ml={4}>▾</Text>
                      </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item onClick={() => setFilterGenre(null)}>
                        <Text size="xs" c="dimmed">すべてのジャンル</Text>
                      </Menu.Item>
                      {availableGenres.map((name) => {
                        const genre = genres.find((g) => g.name === name)
                        const color = genre?.color ?? '#6b7280'
                        return (
                          <Menu.Item
                            key={name}
                            onClick={() => setFilterGenre(name)}
                            leftSection={<span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, display: 'inline-block' }} />}
                          >
                            <Text size="xs" fw={filterGenre === name ? 700 : 400}>{name}</Text>
                          </Menu.Item>
                        )
                      })}
                    </Menu.Dropdown>
                  </Menu>
                )}

                <Checkbox
                  label="完了タスクを表示"
                  checked={showCompletedTasks}
                  onChange={(e) => setShowCompletedTasks(e.currentTarget.checked)}
                  size="xs"
                />

              </Group>
            </Box>

            {/* Task list */}
            <Box style={{ flex: 1, overflowY: 'auto' }} px="md" py="xs">
              {rootTasks.length === 0 ? (
                <Text c="dimmed" size="sm" mt="md">
                  {showCompletedTasks ? 'タスクはまだありません' : '該当するタスクがありません'}
                </Text>
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleRootDragEnd}>
                  <SortableContext items={rootTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {rootTasks.map((task: Task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        depth={1}
                        allTasks={filteredTasks}
                        onSaveError={(msg) => setSaveError(msg)}
                        expandedIds={expandedIds}
                        onToggleExpand={handleToggleExpand}
                        onNavigate={(taskId) => onNavigateToTask(projectId, taskId)}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        clipboardCount={clipboardIds.length}
                        onPasteAfter={handlePaste}
                        onMoveToPhase={handleMoveToPhase}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {showAddRootForm ? (
                <Group gap="xs" mt="xs">
                  <TextInput
                    ref={rootInputRef}
                    value={rootTaskTitle}
                    onChange={(e) => setRootTaskTitle(e.target.value)}
                    onKeyDown={handleRootKeyDown}
                    placeholder="タスク名"
                    size="xs"
                    style={{ flex: 1 }}
                  />
                  <Button size="xs" onClick={handleAddRootTask}>追加</Button>
                  <Button size="xs" variant="default" onClick={() => { setRootTaskTitle(''); setShowAddRootForm(false) }}>キャンセル</Button>
                </Group>
              ) : (
                <Button
                  variant="subtle"
                  size="xs"
                  mt="xs"
                  onClick={() => setShowAddRootForm(true)}
                >
                  ＋ タスクを追加
                </Button>
              )}
            </Box>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Box>
  )
}
