import { useState } from 'react'
import { Menu, Group, Text, UnstyledButton, TextInput, ActionIcon } from '@mantine/core'
import type { Genre } from '../types'

type Props = {
  value: string | null
  genres: Genre[]
  onChange: (value: string | null) => void
  onAddGenre: (name: string) => Promise<void>
}

export function GenrePicker({ value, genres, onChange, onAddGenre }: Props): JSX.Element {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')

  const displayGenres: Genre[] = [...genres]
  if (value && !genres.some((g) => g.name === value)) {
    displayGenres.push({ name: value, color: '#6b7280' })
  }

  const selectedGenre = displayGenres.find((g) => g.name === value) ?? null

  const handleSelect = (name: string | null): void => {
    onChange(name)
    setShowAddForm(false)
    setNewName('')
  }

  const handleAddSubmit = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    await onAddGenre(name)
    onChange(name)
    setShowAddForm(false)
    setNewName('')
  }

  return (
    <Menu
      shadow="md"
      width={180}
      onClose={() => { setShowAddForm(false); setNewName('') }}
    >
      <Menu.Target>
        <UnstyledButton
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '2px 8px', borderRadius: 4,
            border: '1px solid var(--mantine-color-dark-4)',
            fontSize: 12, color: 'var(--mantine-color-dark-1)'
          }}
        >
          {selectedGenre ? (
            <>
              <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: selectedGenre.color, display: 'inline-block', flexShrink: 0 }} />
              <span>{selectedGenre.name}</span>
            </>
          ) : (
            <Text size="xs" c="dimmed">ジャンルなし</Text>
          )}
          <Text size="xs" c="dimmed" ml={4}>▾</Text>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item onClick={() => handleSelect(null)}>
          <Text size="xs" c="dimmed">ジャンルなし</Text>
        </Menu.Item>
        {displayGenres.map((g) => (
          <Menu.Item
            key={g.name}
            onClick={() => handleSelect(g.name)}
            leftSection={<span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: g.color, display: 'inline-block' }} />}
          >
            <Text size="xs" fw={value === g.name ? 700 : 400}>{g.name}</Text>
          </Menu.Item>
        ))}
        <Menu.Divider />
        {showAddForm ? (
          <Group gap={4} px={8} py={4}>
            <TextInput
              size="xs"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubmit() } }}
              placeholder="ジャンル名"
              autoFocus
              style={{ flex: 1 }}
            />
            <ActionIcon size="xs" onClick={handleAddSubmit}>✓</ActionIcon>
            <ActionIcon size="xs" onClick={() => { setShowAddForm(false); setNewName('') }}>✕</ActionIcon>
          </Group>
        ) : (
          <Menu.Item onClick={() => setShowAddForm(true)}>
            <Text size="xs">+ 新しいジャンルを追加</Text>
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  )
}
