import { useState, useEffect, useCallback } from 'react'
import {
  Stack, Group, Text, Button, TextInput, Textarea, Badge,
  Avatar, Card, Checkbox, Box, Loader, Center, Divider, ActionIcon
} from '@mantine/core'
import { marked } from 'marked'
import { useData } from '../context/DataContext'
import type { Issue, IssueComment } from '../types'

marked.setOptions({ breaks: true, gfm: true })

type ViewState =
  | { type: 'list' }
  | { type: 'new' }
  | { type: 'detail'; issueId: string }

type Props = {
  projectId: string
  onOpenCountChange?: (count: number) => void
}

function formatAbsoluteDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ---- Issue List View ----
function IssueListView({
  issues, hideClosed, onHideClosedChange, onSelect, onNew
}: {
  issues: Issue[]
  hideClosed: boolean
  onHideClosedChange: (v: boolean) => void
  onSelect: (issueId: string) => void
  onNew: () => void
}): JSX.Element {
  const sorted = [...issues].sort((a, b) => a.number - b.number)
  const visible = hideClosed ? sorted.filter((i) => i.status === 'open') : sorted

  return (
    <Box p="md">
      <Group justify="space-between" mb="sm">
        <Checkbox
          label="Closedを非表示"
          checked={hideClosed}
          onChange={(e) => onHideClosedChange(e.currentTarget.checked)}
          size="xs"
        />
        <Button size="xs" onClick={onNew}>New Issue</Button>
      </Group>

      <Stack gap="xs">
        {visible.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">No issues</Text>
        ) : (
          visible.map((issue) => (
            <Card key={issue.id} padding="xs" withBorder radius="sm" style={{ opacity: issue.status === 'closed' ? 0.6 : 1 }}>
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <Text size="sm" c={issue.status === 'open' ? 'green' : 'gray'} style={{ flexShrink: 0, paddingTop: 2 }}>
                  {issue.status === 'open' ? '●' : '◉'}
                </Text>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Button
                    variant="transparent"
                    size="xs"
                    p={0}
                    style={{ fontWeight: 500, textAlign: 'left' }}
                    onClick={() => onSelect(issue.id)}
                  >
                    {issue.title}
                  </Button>
                  <Group gap={6} mt={2}>
                    <Text size="xs" c="dimmed">#{issue.number}</Text>
                    <Text size="xs" c="dimmed">
                      {issue.status === 'open' ? 'opened' : 'closed'} {formatAbsoluteDate(issue.createdAt)} by {issue.authorName || 'unknown'}
                    </Text>
                    {issue.comments.length > 0 && (
                      <Text size="xs" c="dimmed">💬 {issue.comments.length}</Text>
                    )}
                  </Group>
                </Box>
              </Group>
            </Card>
          ))
        )}
      </Stack>
    </Box>
  )
}

// ---- New Issue Form ----
function NewIssueForm({
  onSubmit, onCancel
}: {
  onSubmit: (title: string, body: string, labels: string[]) => Promise<void>
  onCancel: () => void
}): JSX.Element {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handleAddLabel = (): void => {
    const l = labelInput.trim()
    if (l && !labels.includes(l)) setLabels((prev) => [...prev, l])
    setLabelInput('')
  }

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) return
    setSubmitting(true)
    try { await onSubmit(title.trim(), body.trim(), labels) } finally { setSubmitting(false) }
  }

  return (
    <Box p="md">
      <Group mb="sm">
        <Button variant="subtle" size="xs" onClick={onCancel} px={4}>← Issues</Button>
        <Text fw={600} size="sm">New Issue</Text>
      </Group>

      <Stack gap="sm">
        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue title"
          size="xs"
          autoFocus
        />

        <Textarea
          label="Description"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment"
          rows={6}
          size="xs"
        />

        <Box>
          <Text size="xs" c="dimmed" mb={4}>Labels</Text>
          <Group gap={4} mb={4}>
            {labels.map((l) => (
              <Badge
                key={l}
                size="xs"
                variant="light"
                rightSection={
                  <button
                    onClick={() => setLabels((prev) => prev.filter((x) => x !== l))}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 11 }}
                  >
                    ×
                  </button>
                }
              >
                {l}
              </Badge>
            ))}
          </Group>
          <TextInput
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLabel() } }}
            placeholder="Add label..."
            size="xs"
            w={160}
          />
        </Box>

        <Group gap="xs">
          <Button size="xs" onClick={handleSubmit} disabled={!title.trim() || submitting}>
            {submitting ? 'Submitting...' : 'Submit New Issue'}
          </Button>
          <Button size="xs" variant="default" onClick={onCancel}>Cancel</Button>
        </Group>
      </Stack>
    </Box>
  )
}

// ---- Issue Detail View ----
function IssueDetailView({
  issue, onBack, onUpdate, onAddComment
}: {
  issue: Issue
  onBack: () => void
  onUpdate: (changes: Partial<Issue>) => Promise<void>
  onAddComment: (body: string) => Promise<IssueComment>
}): JSX.Element {
  const [commentBody, setCommentBody] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [comments, setComments] = useState<IssueComment[]>(issue.comments)
  const [status, setStatus] = useState(issue.status)
  const [togglingStatus, setTogglingStatus] = useState(false)

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(issue.title)

  const handleSaveTitle = async (): Promise<void> => {
    const t = titleDraft.trim()
    if (!t || t === issue.title) { setEditingTitle(false); return }
    await onUpdate({ title: t })
    setEditingTitle(false)
  }

  // Issue body editing
  const [editingBody, setEditingBody] = useState(false)
  const [bodyDraft, setBodyDraft] = useState(issue.body)
  const [savingBody, setSavingBody] = useState(false)

  // Comment editing
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const handleToggleStatus = async (): Promise<void> => {
    setTogglingStatus(true)
    try {
      const newStatus = status === 'open' ? 'closed' : 'open'
      const closedAt = newStatus === 'closed' ? new Date().toISOString() : null
      await onUpdate({ status: newStatus, closedAt })
      setStatus(newStatus)
    } finally { setTogglingStatus(false) }
  }

  const handlePostComment = async (): Promise<void> => {
    const body = commentBody.trim()
    if (!body) return
    setSubmittingComment(true)
    try {
      const newComment = await onAddComment(body)
      setComments((prev) => [...prev, newComment])
      setCommentBody('')
    } finally { setSubmittingComment(false) }
  }

  const handleSaveBody = async (): Promise<void> => {
    setSavingBody(true)
    try {
      await onUpdate({ body: bodyDraft })
      setEditingBody(false)
    } finally { setSavingBody(false) }
  }

  const handleEditComment = (c: IssueComment): void => {
    setEditingCommentId(c.id)
    setCommentDraft(c.body)
  }

  const handleDeleteComment = async (commentId: string): Promise<void> => {
    const updated = comments.filter((c) => c.id !== commentId)
    await onUpdate({ comments: updated })
    setComments(updated)
  }

  const handleSaveComment = async (): Promise<void> => {
    if (!editingCommentId) return
    setSavingComment(true)
    try {
      const updated = comments.map((c) =>
        c.id === editingCommentId ? { ...c, body: commentDraft } : c
      )
      await onUpdate({ comments: updated })
      setComments(updated)
      setEditingCommentId(null)
    } finally { setSavingComment(false) }
  }

  const mdHeaderStyle = {
    borderBottom: '1px solid var(--mantine-color-dark-5)',
    background: 'var(--mantine-color-dark-7)',
  }
  const editIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.811l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.064L11.189 6.25z" />
    </svg>
  )
  const cancelIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
    </svg>
  )
  const saveIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
    </svg>
  )

  return (
    <Box p="md">
      <Button variant="subtle" size="xs" onClick={onBack} px={4} mb="sm">← Issues</Button>

      <Group gap="xs" align="flex-start" mb="xs">
        <Box style={{ flex: 1 }}>
          {editingTitle ? (
            <TextInput
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle()
                if (e.key === 'Escape') { setTitleDraft(issue.title); setEditingTitle(false) }
              }}
              size="sm"
              fw={600}
              autoFocus
            />
          ) : (
            <Text fw={600} size="sm" onClick={() => setEditingTitle(true)} style={{ cursor: 'text' }}>
              {issue.title}
              <Text span c="dimmed" fw={400} ml={6}>#{issue.number}</Text>
            </Text>
          )}
        </Box>
        <Badge size="sm" color={status === 'open' ? 'green' : 'gray'} variant="filled">
          {status === 'open' ? '● Open' : '◉ Closed'}
        </Badge>
      </Group>

      <Group gap="xs" mb="md">
        <Text size="xs" c="dimmed">
          {status === 'open' ? 'Opened' : 'Closed'} {formatAbsoluteDate(issue.createdAt)} by {issue.authorName || 'unknown'}
        </Text>
        {issue.labels.map((l) => (
          <Badge key={l} size="xs" variant="outline">{l}</Badge>
        ))}
      </Group>

      {/* Issue body — MarkdownTab スタイル */}
      <Box className="markdown-file-box" mb="md">
        <Group justify="space-between" px="sm" py={6} style={mdHeaderStyle}>
          <Text size="xs" c="dimmed" fw={500}>Description</Text>
          <Group gap={4}>
            {editingBody ? (
              <>
                <ActionIcon variant="subtle" size="sm" onClick={() => { setBodyDraft(issue.body); setEditingBody(false) }} title="キャンセル (Esc)">
                  {cancelIcon}
                </ActionIcon>
                <ActionIcon variant="light" color="blue" size="sm" onClick={handleSaveBody} title="保存 (Ctrl+S)" disabled={savingBody}>
                  {saveIcon}
                </ActionIcon>
              </>
            ) : (
              <ActionIcon variant="subtle" size="sm" onClick={() => setEditingBody(true)} title="編集">
                {editIcon}
              </ActionIcon>
            )}
          </Group>
        </Group>
        <Box className="markdown-file-content">
          {editingBody ? (
            <>
              <textarea
                className="markdown-tab-editor"
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
                placeholder="Markdownで記述できます..."
                spellCheck={false}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setBodyDraft(issue.body); setEditingBody(false) }
                  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSaveBody() }
                }}
              />
              <Text size="xs" c="dimmed" px="sm" py={4}>Ctrl+S で保存 · Esc でキャンセル</Text>
            </>
          ) : issue.body ? (
            <div className="markdown-tab-preview markdown-body" dangerouslySetInnerHTML={{ __html: (marked.parse(issue.body) as string) }} />
          ) : (
            <Box p="md" style={{ cursor: 'text' }} onClick={() => setEditingBody(true)}>
              <Text size="sm" c="dimmed">クリックして説明を追加...</Text>
              <Text size="xs" c="dimmed" mt={4}>Markdownで記述できます</Text>
            </Box>
          )}
        </Box>
      </Box>

      <Button size="xs" variant="default" onClick={handleToggleStatus} disabled={togglingStatus} mb="md">
        {togglingStatus ? '...' : status === 'open' ? 'Close Issue' : 'Reopen Issue'}
      </Button>

      {/* Comments — MarkdownTab スタイル */}
      {comments.length > 0 && (
        <Stack gap="sm" mb="md">
          <Divider label="Comments" labelPosition="left" />
          {comments.map((c) => (
            <Group key={c.id} gap="xs" align="flex-start">
              <Avatar size="sm" radius="xl" color="blue">{getInitials(c.authorName)}</Avatar>
              <Box className="markdown-file-box" style={{ flex: 1 }}>
                <Group justify="space-between" px="sm" py={6} style={mdHeaderStyle}>
                  <Group gap="xs">
                    <Text size="xs" fw={600}>{c.authorName || 'unknown'}</Text>
                    <Text size="xs" c="dimmed">{formatAbsoluteDate(c.createdAt)}</Text>
                  </Group>
                  <Group gap={4}>
                    {editingCommentId === c.id ? (
                      <>
                        <ActionIcon variant="subtle" size="sm" onClick={() => setEditingCommentId(null)} title="キャンセル (Esc)">
                          {cancelIcon}
                        </ActionIcon>
                        <ActionIcon variant="light" color="blue" size="sm" onClick={handleSaveComment} title="保存 (Ctrl+S)" disabled={savingComment}>
                          {saveIcon}
                        </ActionIcon>
                      </>
                    ) : (
                      <>
                        <ActionIcon variant="subtle" size="sm" onClick={() => handleEditComment(c)} title="編集">
                          {editIcon}
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          title="削除"
                          onClick={() => {
                            if (window.confirm('このコメントを削除しますか？')) handleDeleteComment(c.id)
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM6.75 1.5a.25.25 0 00-.25.25V3h3V1.75a.25.25 0 00-.25-.25h-2.5zM4.997 6.5a.75.75 0 10-1.493.144L4.916 13.5H3.75a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-1.166l1.412-6.856a.75.75 0 10-1.493-.144L9.582 13.5H6.418L4.997 6.5z" />
                          </svg>
                        </ActionIcon>
                      </>
                    )}
                  </Group>
                </Group>
                <Box className="markdown-file-content">
                  {editingCommentId === c.id ? (
                    <>
                      <textarea
                        className="markdown-tab-editor"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        spellCheck={false}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingCommentId(null)
                          if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSaveComment() }
                        }}
                      />
                      <Text size="xs" c="dimmed" px="sm" py={4}>Ctrl+S で保存 · Esc でキャンセル</Text>
                    </>
                  ) : (
                    <div className="markdown-tab-preview markdown-body" dangerouslySetInnerHTML={{ __html: (marked.parse(c.body) as string) }} />
                  )}
                </Box>
              </Box>
            </Group>
          ))}
        </Stack>
      )}

      {/* New comment form — MarkdownTab スタイル */}
      <Box className="markdown-file-box">
        <Group justify="space-between" px="sm" py={6} style={mdHeaderStyle}>
          <Text size="xs" c="dimmed" fw={500}>コメントを追加</Text>
          <Button
            size="xs"
            onClick={handlePostComment}
            disabled={!commentBody.trim() || submittingComment}
          >
            {submittingComment ? 'Posting...' : 'Comment'}
          </Button>
        </Group>
        <Box className="markdown-file-content">
          <textarea
            className="markdown-tab-editor"
            style={{ minHeight: 120 }}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Markdownで記述できます..."
            spellCheck={false}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handlePostComment() }
            }}
          />
          <Text size="xs" c="dimmed" px="sm" py={4}>Ctrl+Enter で送信</Text>
        </Box>
      </Box>
    </Box>
  )
}

// ---- IssuesTab (root component) ----
export function IssuesTab({ projectId, onOpenCountChange }: Props): JSX.Element {
  const { listIssues, createIssue, updateIssue, addIssueComment } = useData()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewState>({ type: 'list' })
  const [hideClosed, setHideClosed] = useState(false)

  const loadIssues = useCallback(async () => {
    setLoading(true)
    try { setIssues(await listIssues(projectId, null)) } finally { setLoading(false) }
  }, [listIssues, projectId])

  useEffect(() => { loadIssues() }, [loadIssues])

  useEffect(() => {
    onOpenCountChange?.(issues.filter((i) => i.status === 'open').length)
  }, [issues, onOpenCountChange])

  const handleCreate = async (title: string, body: string, labels: string[]): Promise<void> => {
    const newIssue = await createIssue(projectId, null, { title, body, labels })
    setIssues((prev) => [...prev, newIssue])
    setView({ type: 'list' })
  }

  const handleUpdate = async (issueId: string, changes: Partial<Issue>): Promise<void> => {
    const updated = await updateIssue(projectId, issueId, changes)
    setIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)))
  }

  const handleAddComment = async (issueId: string, body: string): Promise<IssueComment> => {
    return await addIssueComment(projectId, issueId, body)
  }

  if (loading) {
    return <Center p="xl"><Loader size="sm" /></Center>
  }

  if (view.type === 'new') {
    return <NewIssueForm onSubmit={handleCreate} onCancel={() => setView({ type: 'list' })} />
  }

  if (view.type === 'detail') {
    const issue = issues.find((i) => i.id === view.issueId)
    if (!issue) return <Text p="md" c="dimmed" size="sm">Issue not found</Text>
    return (
      <IssueDetailView
        issue={issue}
        onBack={() => setView({ type: 'list' })}
        onUpdate={(changes) => handleUpdate(issue.id, changes)}
        onAddComment={(body) => handleAddComment(issue.id, body)}
      />
    )
  }

  return (
    <IssueListView
      issues={issues}
      hideClosed={hideClosed}
      onHideClosedChange={setHideClosed}
      onSelect={(issueId) => setView({ type: 'detail', issueId })}
      onNew={() => setView({ type: 'new' })}
    />
  )
}
