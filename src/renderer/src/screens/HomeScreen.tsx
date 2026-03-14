import { useState, useRef, useEffect } from 'react'
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
    return <div className="loading-screen">読み込み中...</div>
  }

  if (error) {
    return <div className="error-screen">データの読み込みに失敗しました: {error}</div>
  }

  return (
    <div className="home-screen">
      {loadErrors.map((e) => (
        <ErrorBanner
          key={e.filePath}
          level="warning"
          message={`ファイルの読み込みをスキップしました: ${e.filePath} — ${e.message}`}
          filePath={e.filePath}
          onClose={dismissLoadErrors}
        />
      ))}
      <h1>プロジェクト一覧</h1>

      {projects.length === 0 && !showAddForm && (
        <p className="empty-message">プロジェクトはまだありません</p>
      )}

      <ul className="project-list">
        {projects.map((project: Project) => {
          const taskCount = (tasksByProject[project.id] ?? []).length
          const isEditing = editingProjectId === project.id
          const isDeleting = deletingProjectId === project.id

          return (
            <li key={project.id} className="project-card">
              {isEditing ? (
                <div className="project-edit-form">
                  <input
                    ref={editRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                  />
                  <button onClick={handleEditConfirm}>確定</button>
                  <button onClick={() => setEditingProjectId(null)}>キャンセル</button>
                </div>
              ) : isDeleting ? (
                <div className="project-delete-confirm">
                  <span>「{project.name}」とタスク {taskCount} 件を削除しますか？</span>
                  <button onClick={() => handleDeleteConfirm(project.id)}>削除</button>
                  <button onClick={() => setDeletingProjectId(null)}>キャンセル</button>
                </div>
              ) : (
                <div
                  className="project-card-content"
                  onClick={() => onNavigateToProject(project.id)}
                >
                  <span className="project-name">{project.name}</span>
                  <div className="project-actions" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => startEdit(project)}>✏️</button>
                    <button onClick={() => setDeletingProjectId(project.id)}>🗑️</button>
                  </div>
                </div>
              )}
            </li>
          )
        })}

        {showAddForm ? (
          <li className="project-add-form">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="プロジェクト名"
            />
            <button onClick={handleAddConfirm}>追加</button>
            <button onClick={() => { setNewName(''); setShowAddForm(false) }}>キャンセル</button>
          </li>
        ) : (
          <li>
            <button className="add-project-btn" onClick={() => setShowAddForm(true)}>
              ＋ プロジェクトを追加
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}
