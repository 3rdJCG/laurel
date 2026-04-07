import { useState, useEffect, useCallback } from 'react'
import {
  Stack, Group, Text, Button, TextInput, Textarea, Badge,
  Avatar, Card, Checkbox, Box, Loader, Center, Divider
} from '@mantine/core'
import { useData } from '../context/DataContext'
import type { Issue, IssueComment } from '../types'

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

  return (
    <Box p="md">
      <Button variant="subtle" size="xs" onClick={onBack} px={4} mb="sm">← Issues</Button>

      <Group gap="xs" align="flex-start" mb="xs">
        <Text fw={600} size="sm" style={{ flex: 1 }}>
          {issue.title}
          <Text span c="dimmed" fw={400} ml={6}>#{issue.number}</Text>
        </Text>
        <Badge
          size="sm"
          color={status === 'open' ? 'green' : 'gray'}
          variant="filled"
        >
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

      {issue.body && (
        <Card withBorder padding="sm" mb="md" radius="sm">
          {issue.body.split('\n').map((line, i) => (
            <Text key={i} size="xs" mb={2}>{line}</Text>
          ))}
        </Card>
      )}

      <Button
        size="xs"
        variant="default"
        onClick={handleToggleStatus}
        disabled={togglingStatus}
        mb="md"
      >
        {togglingStatus ? '...' : status === 'open' ? 'Close Issue' : 'Reopen Issue'}
      </Button>

      {/* Comments */}
      {comments.length > 0 && (
        <Stack gap="sm" mb="md">
          <Divider label="Comments" labelPosition="left" />
          {comments.map((c) => (
            <Group key={c.id} gap="xs" align="flex-start">
              <Avatar size="sm" radius="xl" color="blue">
                {getInitials(c.authorName)}
              </Avatar>
              <Card withBorder padding="xs" radius="sm" style={{ flex: 1 }}>
                <Group gap="xs" mb={4}>
                  <Text size="xs" fw={600}>{c.authorName || 'unknown'}</Text>
                  <Text size="xs" c="dimmed">{formatAbsoluteDate(c.createdAt)}</Text>
                </Group>
                {c.body.split('\n').map((line, i) => (
                  <Text key={i} size="xs" mb={2}>{line}</Text>
                ))}
              </Card>
            </Group>
          ))}
        </Stack>
      )}

      {/* New comment form */}
      <Stack gap="xs">
        <Textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder="Leave a comment..."
          rows={4}
          size="xs"
        />
        <Group justify="flex-end">
          <Button
            size="xs"
            onClick={handlePostComment}
            disabled={!commentBody.trim() || submittingComment}
          >
            {submittingComment ? 'Posting...' : 'Comment'}
          </Button>
        </Group>
      </Stack>
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
