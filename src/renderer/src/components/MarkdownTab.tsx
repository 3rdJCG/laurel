import { useState, useRef, useEffect } from 'react'
import { marked } from 'marked'
import { ActionIcon, Group, Text, Box, Popover, Stack, UnstyledButton } from '@mantine/core'
import { useData } from '../context/DataContext'
import type { Task } from '../types'

marked.setOptions({ breaks: true, gfm: true })

const renderer = new marked.Renderer()
renderer.heading = function ({ text, depth }) {
  const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
  return `<h${depth} id="${id}">${text}</h${depth}>\n`
}
marked.use({ renderer })

type Heading = { level: number; text: string; id: string }

function extractHeadings(markdown: string): Heading[] {
  return Array.from(markdown.matchAll(/^(#{1,6})\s+(.+)$/gm)).map((m) => {
    const text = m[2].trim()
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    return { level: m[1].length, text, id }
  })
}

type Props = {
  task: Task
  projectId: string
}

export function MarkdownTab({ task, projectId }: Props): JSX.Element {
  const { updateTask } = useData()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.description ?? '')
  const [showToc, setShowToc] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) setDraft(task.description ?? '')
  }, [task.description, editing])

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  const handleSave = async (): Promise<void> => {
    await updateTask(projectId, task.id, { description: draft || null })
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Escape') { setDraft(task.description ?? ''); setEditing(false) }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
  }

  const html = marked.parse(task.description ?? '') as string
  const headings = extractHeadings(task.description ?? '')

  const handleTocClick = (id: string): void => {
    setShowToc(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <Box className="markdown-file-box">
      {/* Header */}
      <Group
        justify="space-between"
        px="sm"
        py={6}
        style={{ borderBottom: '1px solid var(--mantine-color-dark-5)', background: 'var(--mantine-color-dark-7)' }}
      >
        <Text size="xs" c="dimmed" fw={500}>Description</Text>
        <Group gap={4}>
          {/* TOC */}
          <Popover opened={showToc} onClose={() => setShowToc(false)} position="bottom-end" withArrow shadow="md">
            <Popover.Target>
              <ActionIcon
                variant={showToc ? 'light' : 'subtle'}
                size="sm"
                onClick={() => setShowToc((v) => !v)}
                title="見出し一覧"
                disabled={headings.length === 0}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 4h12v1.5H2V4zm0 3.5h8v1.5H2V7.5zm0 3.5h10v1.5H2V11z" />
                </svg>
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown p={4} style={{ minWidth: 180 }}>
              <Stack gap={2}>
                {headings.map((h, i) => (
                  <UnstyledButton
                    key={i}
                    onClick={() => handleTocClick(h.id)}
                    style={{ paddingLeft: (h.level - 1) * 12 + 8, paddingTop: 4, paddingBottom: 4, borderRadius: 4 }}
                  >
                    <Text size="xs">{h.text}</Text>
                  </UnstyledButton>
                ))}
              </Stack>
            </Popover.Dropdown>
          </Popover>

          {/* Edit / Save / Cancel */}
          {editing ? (
            <>
              <ActionIcon variant="subtle" size="sm" onClick={() => { setDraft(task.description ?? ''); setEditing(false) }} title="キャンセル (Esc)">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                </svg>
              </ActionIcon>
              <ActionIcon variant="light" color="blue" size="sm" onClick={handleSave} title="保存 (Ctrl+S)">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                </svg>
              </ActionIcon>
            </>
          ) : (
            <ActionIcon variant="subtle" size="sm" onClick={() => setEditing(true)} title="編集">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.811l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.064L11.189 6.25z" />
              </svg>
            </ActionIcon>
          )}
        </Group>
      </Group>

      {/* Content */}
      <Box className="markdown-file-content">
        {editing ? (
          <Box>
            <textarea
              ref={textareaRef}
              className="markdown-tab-editor"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Markdownで記述できます..."
              spellCheck={false}
            />
            <Text size="xs" c="dimmed" px="sm" py={4}>Ctrl+S で保存 · Esc でキャンセル</Text>
          </Box>
        ) : task.description ? (
          <div
            className="markdown-tab-preview markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <Box
            className="markdown-tab-empty"
            onClick={() => setEditing(true)}
            p="md"
            style={{ cursor: 'text' }}
          >
            <Text size="sm" c="dimmed">クリックして詳細を追加...</Text>
            <Text size="xs" c="dimmed" mt={4}>Markdownで記述できます</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}
