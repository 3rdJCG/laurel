import { useState, useRef, useEffect } from 'react'
import { marked } from 'marked'
import { useData } from '../context/DataContext'
import type { Task } from '../types'

marked.setOptions({ breaks: true, gfm: true })

type Props = {
  task: Task
  projectId: string
}

export function MarkdownTab({ task, projectId }: Props): JSX.Element {
  const { updateTask } = useData()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.description ?? '')
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
    if (e.key === 'Escape') {
      setDraft(task.description ?? '')
      setEditing(false)
    }
    // Ctrl+S / Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  const html = marked.parse(task.description ?? '') as string

  return (
    <div className="markdown-tab">
      <div className="markdown-tab-toolbar">
        {editing ? (
          <>
            <button className="btn-confirm" onClick={handleSave}>保存</button>
            <button className="btn-cancel" onClick={() => { setDraft(task.description ?? ''); setEditing(false) }}>
              キャンセル
            </button>
            <span className="markdown-tab-hint">Ctrl+S で保存 · Esc でキャンセル</span>
          </>
        ) : (
          <button className="markdown-tab-edit-btn" onClick={() => setEditing(true)}>
            編集
          </button>
        )}
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          className="markdown-tab-editor"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Markdownで記述できます..."
          spellCheck={false}
        />
      ) : task.description ? (
        <div
          className="markdown-tab-preview markdown-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="markdown-tab-empty" onClick={() => setEditing(true)}>
          <p>クリックして詳細を追加...</p>
          <p className="markdown-tab-empty-hint">Markdownで記述できます</p>
        </div>
      )}
    </div>
  )
}
