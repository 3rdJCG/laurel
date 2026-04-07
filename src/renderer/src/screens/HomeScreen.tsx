import { useState, useRef, useEffect } from 'react'
import {
  Stack, Group, Text, Title, TextInput, Button, ActionIcon,
  Card, Box, Loader, Center
} from '@mantine/core'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useData } from '../context/DataContext'
import { ErrorBanner } from '../components/ErrorBanner'
import type { Project } from '../types'

type Props = {
  onNavigateToProject: (projectId: string) => void
}

export function HomeScreen({ onNavigateToProject }: Props): JSX.Element {
  const { projects, tasksByProject, isLoading, error, loadErrors, dismissLoadErrors, createProject, updateProject, deleteProject } = useData()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

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

  return (
    <Box p="md" style={{ maxWidth: 640, margin: '0 auto' }}>
      <Stack gap="xs">
        {loadErrors.map((e) => (
          <ErrorBanner
            key={e.filePath}
            level="warning"
            message={`ファイルの読み込みをスキップしました: ${e.filePath} — ${e.message}`}
            filePath={e.filePath}
            onClose={dismissLoadErrors}
          />
        ))}

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
            const isEditing = editingProjectId === project.id
            const isDeleting = deletingProjectId === project.id

            return (
              <Card
                key={project.id}
                padding="sm"
                radius="md"
                withBorder
                style={{ cursor: isEditing || isDeleting ? 'default' : 'pointer' }}
              >
                {isEditing ? (
                  <Group gap="xs">
                    <TextInput
                      ref={editRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      size="xs"
                      style={{ flex: 1 }}
                    />
                    <Button size="xs" onClick={handleEditConfirm}>確定</Button>
                    <Button size="xs" variant="default" onClick={() => setEditingProjectId(null)}>キャンセル</Button>
                  </Group>
                ) : isDeleting ? (
                  <Group gap="xs" wrap="nowrap">
                    <Text size="xs" style={{ flex: 1 }}>
                      「{project.name}」とタスク {taskCount} 件を削除しますか？
                    </Text>
                    <Button size="xs" color="red" onClick={() => handleDeleteConfirm(project.id)}>削除</Button>
                    <Button size="xs" variant="default" onClick={() => setDeletingProjectId(null)}>キャンセル</Button>
                  </Group>
                ) : (
                  <Group justify="space-between" onClick={() => onNavigateToProject(project.id)}>
                    <div>
                      <Text size="sm" fw={500}>{project.name}</Text>
                      <Text size="xs" c="dimmed">{taskCount} タスク</Text>
                    </div>
                    <Group gap={4} onClick={(e) => e.stopPropagation()}>
                      <ActionIcon variant="subtle" size="sm" onClick={() => startEdit(project)} title="名前を編集">
                        <IconPencil size={14} stroke={1.5} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" size="sm" color="red" onClick={() => setDeletingProjectId(project.id)} title="削除">
                        <IconTrash size={14} stroke={1.5} />
                      </ActionIcon>
                    </Group>
                  </Group>
                )}
              </Card>
            )
          })}

          {showAddForm ? (
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
          ) : null}
        </Stack>
      </Stack>
    </Box>
  )
}
