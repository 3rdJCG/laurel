import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import type { Comment } from '../types'

type Props = {
  projectId: string
  taskId: string
}

function CommentNode({
  comment,
  allComments,
  onReply
}: {
  comment: Comment
  allComments: Comment[]
  onReply: (parentId: string) => void
}): JSX.Element {
  const [showEmail, setShowEmail] = useState(false)
  const replies = allComments
    .filter((c) => c.parentId === comment.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return (
    <div className="conv-comment">
      <div className="conv-comment-header">
        <button
          className="conv-author"
          onClick={() => setShowEmail((v) => !v)}
          title={showEmail ? 'メールアドレスを隠す' : 'メールアドレスを表示'}
        >
          {comment.authorName || '(名前なし)'}
        </button>
        {showEmail && (
          <span className="conv-author-email">{comment.authorEmail || '(メールなし)'}</span>
        )}
        <span className="conv-timestamp">{new Date(comment.createdAt).toLocaleString('ja-JP')}</span>
      </div>
      <div className="conv-comment-body">{comment.body}</div>
      <button className="conv-reply-btn" onClick={() => onReply(comment.id)}>
        返信
      </button>
      {replies.length > 0 && (
        <div className="conv-replies">
          {replies.map((r) => (
            <CommentNode key={r.id} comment={r} allComments={allComments} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ConversationTab({ projectId, taskId }: Props): JSX.Element {
  const { listComments, addComment } = useData()
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listComments(projectId, taskId).then(setComments)
  }, [projectId, taskId, listComments])

  const rootComments = comments
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const handleSubmit = async (): Promise<void> => {
    const text = body.trim()
    if (!text) return
    setSubmitting(true)
    try {
      const newComment = await addComment(projectId, {
        taskId,
        parentId: replyToId,
        body: text
      })
      setComments((prev) => [...prev, newComment])
      setBody('')
      setReplyToId(null)
    } finally {
      setSubmitting(false)
    }
  }

  const replyTarget = replyToId ? comments.find((c) => c.id === replyToId) : null

  return (
    <div className="conv-tab">
      <div className="conv-list">
        {rootComments.length === 0 ? (
          <p className="empty-message">コメントはまだありません</p>
        ) : (
          rootComments.map((c) => (
            <CommentNode
              key={c.id}
              comment={c}
              allComments={comments}
              onReply={(id) => setReplyToId(id)}
            />
          ))
        )}
      </div>

      <div className="conv-form">
        {replyTarget && (
          <div className="conv-reply-indicator">
            <span>
              「{replyTarget.authorName || '(名前なし)'}」への返信
            </span>
            <button onClick={() => setReplyToId(null)}>×</button>
          </div>
        )}
        <textarea
          className="conv-body-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="コメントを入力..."
          rows={3}
        />
        <button
          className="btn-confirm"
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
        >
          {submitting ? '送信中...' : '投稿'}
        </button>
      </div>
    </div>
  )
}
