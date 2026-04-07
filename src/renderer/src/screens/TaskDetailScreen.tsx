import { useState, useRef, useEffect } from 'react'
import {
  Tabs, Box, Group, Text, Button, TextInput,
  Badge, ActionIcon, Breadcrumbs, Stack
} from '@mantine/core'
import { IconArrowLeft, IconX } from '@tabler/icons-react'
import { useData } from '../context/DataContext'
import { GenrePicker } from '../components/GenrePicker'
import { KanbanView } from '../components/KanbanView'
import { MarkdownTab } from '../components/MarkdownTab'
import type { Task } from '../types'

// ── TaskInfoHeader ─────────────────────────────────────────────────────────────

type HeaderProps = {
  task: Task
  projectId: string
}

function TaskInfoHeader({ task, projectId }: HeaderProps): JSX.Element {
  const { updateTask, genres, addGenre } = useData()
  const [editTitle, setEditTitle] = useState(task.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTag, setNewTag] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editingTitle) setEditTitle(task.title)
  }, [task.title, editingTitle])

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus()
  }, [editingTitle])

  const saveTitle = async (): Promise<void> => {
    const title = editTitle.trim()
    if (!title || title === task.title) { setEditingTitle(false); return }
    await updateTask(projectId, task.id, { title })
    setEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') saveTitle()
    if (e.key === 'Escape') { setEditTitle(task.title); setEditingTitle(false) }
  }

  const handleAddTag = async (tag: string): Promise<void> => {
    const t = tag.trim()
    if (!t || task.tags.includes(t)) { setNewTag(''); return }
    await updateTask(projectId, task.id, { tags: [...task.tags, t] })
    setNewTag('')
  }

  const handleRemoveTag = async (tag: string): Promise<void> => {
    await updateTask(projectId, task.id, { tags: task.tags.filter((t) => t !== tag) })
  }

  return (
    <Stack gap="sm" mb="md">
      {/* Title */}
      {editingTitle ? (
        <TextInput
          ref={titleRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          onBlur={saveTitle}
          size="md"
          fw={600}
        />
      ) : (
        <Text
          size="lg"
          fw={600}
          onClick={() => setEditingTitle(true)}
          style={{ cursor: 'text' }}
        >
          {task.title}
        </Text>
      )}

      {/* Genre */}
      <Group gap="xs" align="center">
        <Text size="xs" c="dimmed" w={60}>ジャンル</Text>
        <GenrePicker
          value={task.genre ?? null}
          genres={genres}
          onChange={(v) => updateTask(projectId, task.id, { genre: v ?? null })}
          onAddGenre={addGenre}
        />
      </Group>

      {/* Tags */}
      <Group gap="xs" align="center">
        <Text size="xs" c="dimmed" w={60}>タグ</Text>
        <Group gap={4}>
          {task.tags.map((tag) => (
            <Badge
              key={tag}
              size="sm"
              variant="light"
              rightSection={
                <ActionIcon
                  size={10}
                  variant="transparent"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`${tag}を削除`}
                >
                  <IconX size={8} stroke={2} />
                </ActionIcon>
              }
            >
              {tag}
            </Badge>
          ))}
          <TextInput
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(newTag) } }}
            placeholder="+ タグ追加"
            size="xs"
            variant="unstyled"
            w={100}
          />
        </Group>
      </Group>

      {/* Occurred date */}
      <Group gap="xs" align="center">
        <Text size="xs" c="dimmed" w={60}>発生日</Text>
        <input
          type="date"
          value={task.occurredAt ?? ''}
          onChange={(e) => updateTask(projectId, task.id, { occurredAt: e.target.value || null })}
          className="task-info-date-input"
        />
      </Group>

      {/* Due date */}
      <Group gap="xs" align="center">
        <Text size="xs" c="dimmed" w={60}>期限日</Text>
        <input
          type="date"
          value={task.dueAt ?? ''}
          onChange={(e) => updateTask(projectId, task.id, { dueAt: e.target.value || null })}
          className="task-info-date-input"
        />
      </Group>
    </Stack>
  )
}

// ── TaskDetailScreen ───────────────────────────────────────────────────────────

type Props = {
  projectId: string
  taskId: string
  onNavigateBack: () => void
}

export function TaskDetailScreen({ projectId, taskId, onNavigateBack }: Props): JSX.Element {
  const { projects, tasksByProject } = useData()
  const [activeTab, setActiveTab] = useState<string>('detail')

  const project = projects.find((p) => p.id === projectId)
  const allTasks = tasksByProject[projectId] ?? []
  const task = allTasks.find((t) => t.id === taskId)

  if (!task) {
    return (
      <Box p="md">
        <Text c="dimmed" size="sm">タスクが見つかりません</Text>
        <Button variant="subtle" size="xs" mt="xs" onClick={onNavigateBack}>戻る</Button>
      </Box>
    )
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Breadcrumb header */}
      <Box px="md" pt="md" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
        <Group gap="xs" align="center">
          <Button variant="subtle" size="xs" onClick={onNavigateBack} px={4} leftSection={<IconArrowLeft size={14} stroke={1.5} />}>戻る</Button>
          <Breadcrumbs separator="/" fz="xs" c="dimmed">
            <Text size="xs" c="dimmed">{project?.name ?? projectId}</Text>
            <Text size="xs">{task.title}</Text>
          </Breadcrumbs>
        </Group>
      </Box>

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'detail')} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Box px="md">
          <Tabs.List>
            <Tabs.Tab value="detail">Detail</Tabs.Tab>
            <Tabs.Tab value="kanban">Kanban</Tabs.Tab>
          </Tabs.List>
        </Box>

        <Tabs.Panel value="detail" style={{ flex: 1, overflowY: 'auto' }}>
          <Box p="md">
            <TaskInfoHeader task={task} projectId={projectId} />
            <MarkdownTab task={task} projectId={projectId} />
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="kanban" style={{ flex: 1, overflow: 'hidden' }}>
          <KanbanView projectId={projectId} parentTaskId={taskId} />
        </Tabs.Panel>
      </Tabs>
    </Box>
  )
}
