import { useState, useEffect, useCallback } from 'react'
import { useData } from '../context/DataContext'
import type { Issue, IssueComment } from '../types'

type ViewState =
  | { type: 'list' }
  | { type: 'new' }
  | { type: 'detail'; issueId: string }

type Props = {
  projectId: string
  taskId: string
  onOpenCountChange?: (count: number) => void
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ---- Issue List View ----
function IssueListView({
  issues,
  filter,
  onFilterChange,
  onSelect,
  onNew
}: {
  issues: Issue[]
  filter: 'open' | 'closed'
  onFilterChange: (f: 'open' | 'closed') => void
  onSelect: (issueId: string) => void
  onNew: () => void
}): JSX.Element {
  const openCount = issues.filter((i) => i.status === 'open').length
  const closedCount = issues.filter((i) => i.status === 'closed').length
  const filtered = issues.filter((i) => i.status === filter)

  return (
    <div className="issues-container">
      <div className="issues-header">
        <div className="issues-filter-bar">
          <button
            className={`issues-filter-btn ${filter === 'open' ? 'issues-filter-btn--active' : ''}`}
            onClick={() => onFilterChange('open')}
          >
            ○ Open ({openCount})
          </button>
          <button
            className={`issues-filter-btn ${filter === 'closed' ? 'issues-filter-btn--active' : ''}`}
            onClick={() => onFilterChange('closed')}
          >
            ✓ Closed ({closedCount})
          </button>
        </div>
        <button className="issues-new-btn" onClick={onNew}>
          New Issue
        </button>
      </div>

      <ul className="issue-list">
        {filtered.length === 0 ? (
          <li className="issue-row" style={{ color: '#888', justifyContent: 'center' }}>
            {filter === 'open' ? 'No open issues' : 'No closed issues'}
          </li>
        ) : (
          filtered.map((issue) => (
            <li key={issue.id} className="issue-row">
              <span
                className={`issue-status-icon issue-status-icon--${issue.status}`}
                aria-label={issue.status}
              >
                {issue.status === 'open' ? '●' : '◉'}
              </span>
              <div className="issue-info">
                <button className="issue-title" onClick={() => onSelect(issue.id)}>
                  {issue.title}
                </button>
                <div className="issue-meta">
                  <span className="issue-number">#{issue.number}</span>
                  <span>opened {formatRelativeDate(issue.createdAt)} by {issue.authorName || 'unknown'}</span>
                  {issue.comments.length > 0 && (
                    <span className="issue-comment-count">💬 {issue.comments.length}</span>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

// ---- New Issue Form ----
function NewIssueForm({
  onSubmit,
  onCancel
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
    if (l && !labels.includes(l)) {
      setLabels((prev) => [...prev, l])
    }
    setLabelInput('')
  }

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(title.trim(), body.trim(), labels)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="issue-form">
      <div className="issue-form-header">
        <button className="issue-form-back" onClick={onCancel}>← Issues</button>
        <h2 style={{ margin: 0, fontSize: 16 }}>New Issue</h2>
      </div>

      <div className="issue-form-body">
        <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>Title</label>
        <input
          className="issue-form-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue title"
          autoFocus
        />

        <label style={{ fontSize: 12, color: '#8b949e', display: 'block', margin: '12px 0 4px' }}>
          Description
        </label>
        <textarea
          className="issue-form-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment"
          rows={6}
        />

        <label style={{ fontSize: 12, color: '#8b949e', display: 'block', margin: '12px 0 4px' }}>
          Labels
        </label>
        <div className="issue-labels-editor">
          {labels.map((l) => (
            <span key={l} className="issue-label-tag">
              {l}
              <button
                onClick={() => setLabels((prev) => prev.filter((x) => x !== l))}
                style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '0 2px', fontSize: 12 }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLabel() } }}
            placeholder="Add label..."
            style={{ border: 'none', background: 'none', color: '#e0e0e0', outline: 'none', fontSize: 13, minWidth: 80 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            className="issue-submit-btn"
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit New Issue'}
          </button>
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ---- Issue Detail View ----
function IssueDetailView({
  issue,
  onBack,
  onUpdate,
  onAddComment
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
    } finally {
      setTogglingStatus(false)
    }
  }

  const handlePostComment = async (): Promise<void> => {
    const body = commentBody.trim()
    if (!body) return
    setSubmittingComment(true)
    try {
      const newComment = await onAddComment(body)
      setComments((prev) => [...prev, newComment])
      setCommentBody('')
    } finally {
      setSubmittingComment(false)
    }
  }

  return (
    <div className="issue-detail">
      <button className="issue-form-back" onClick={onBack}>← Issues</button>

      <div className="issue-detail-header">
        <h2 className="issue-detail-title">
          {issue.title}
          <span style={{ color: '#8b949e', fontWeight: 400, marginLeft: 8 }}>#{issue.number}</span>
        </h2>
        <span className={`issue-status-badge issue-status-badge--${status}`}>
          {status === 'open' ? '● Open' : '◉ Closed'}
        </span>
      </div>

      <div className="issue-meta" style={{ marginBottom: 16 }}>
        <span>{status === 'open' ? 'Opened' : 'Closed'} {formatRelativeDate(issue.createdAt)} by {issue.authorName || 'unknown'}</span>
        {issue.labels.length > 0 && (
          <span style={{ marginLeft: 8 }}>
            {issue.labels.map((l) => (
              <span key={l} className="issue-label-tag" style={{ marginLeft: 4 }}>{l}</span>
            ))}
          </span>
        )}
      </div>

      {issue.body && (
        <div className="issue-body">
          {issue.body.split('\n').map((line, i) => (
            <p key={i} style={{ margin: '0 0 4px' }}>{line}</p>
          ))}
        </div>
      )}

      <button
        className="issue-close-btn"
        onClick={handleToggleStatus}
        disabled={togglingStatus}
      >
        {togglingStatus
          ? '...'
          : status === 'open'
          ? 'Close Issue'
          : 'Reopen Issue'}
      </button>

      {/* Comment thread */}
      {comments.length > 0 && (
        <div className="issue-comments">
          {comments.map((c) => (
            <div key={c.id} className="issue-comment-item">
              <div className="issue-comment-avatar">
                {getInitials(c.authorName)}
              </div>
              <div className="issue-comment-bubble">
                <div className="issue-comment-header">
                  <span className="issue-comment-author">{c.authorName || 'unknown'}</span>
                  <span className="issue-comment-time">{formatRelativeDate(c.createdAt)}</span>
                </div>
                <div className="issue-comment-body">
                  {c.body.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: '0 0 4px' }}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment form */}
      <div className="issue-comment-form">
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder="Leave a comment..."
          rows={4}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            className="issue-submit-btn"
            onClick={handlePostComment}
            disabled={!commentBody.trim() || submittingComment}
          >
            {submittingComment ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- IssuesTab (root component) ----
export function IssuesTab({ projectId, taskId, onOpenCountChange }: Props): JSX.Element {
  const { listIssues, createIssue, updateIssue, addIssueComment } = useData()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewState>({ type: 'list' })
  const [filter, setFilter] = useState<'open' | 'closed'>('open')

  const loadIssues = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listIssues(projectId, taskId)
      setIssues(result)
    } finally {
      setLoading(false)
    }
  }, [listIssues, projectId, taskId])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  useEffect(() => {
    const openCount = issues.filter((i) => i.status === 'open').length
    onOpenCountChange?.(openCount)
  }, [issues, onOpenCountChange])

  const handleCreate = async (title: string, body: string, labels: string[]): Promise<void> => {
    const newIssue = await createIssue(projectId, taskId, { title, body, labels })
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
    return <div className="loading-screen">Loading issues...</div>
  }

  if (view.type === 'new') {
    return (
      <NewIssueForm
        onSubmit={handleCreate}
        onCancel={() => setView({ type: 'list' })}
      />
    )
  }

  if (view.type === 'detail') {
    const issue = issues.find((i) => i.id === view.issueId)
    if (!issue) return <div>Issue not found</div>
    return (
      <IssueDetailView
        issue={issue}
        onBack={() => setView({ type: 'list' })}
        onUpdate={(changes) => handleUpdate(issue.id, changes)}
        onAddComment={(body) => handleAddComment(issue.id, body)}
      />
    )
  }

  // list view
  return (
    <IssueListView
      issues={issues}
      filter={filter}
      onFilterChange={setFilter}
      onSelect={(issueId) => setView({ type: 'detail', issueId })}
      onNew={() => setView({ type: 'new' })}
    />
  )
}
