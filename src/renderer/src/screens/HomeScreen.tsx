import { useState, useRef, useEffect } from 'react'
import { useData } from '../context/DataContext'
import type { Project } from '../types'

type Props = {
  onNavigateToProject: (projectId: string) => void
}

export function HomeScreen({ onNavigateToProject }: Props): JSX.Element {
  const { projects, isLoading, error } = useData()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { createProject } = useData()

  useEffect(() => {
    if (showAddForm) inputRef.current?.focus()
  }, [showAddForm])

  const handleConfirm = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    await createProject(name)
    setNewName('')
    setShowAddForm(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') {
      setNewName('')
      setShowAddForm(false)
    }
  }

  if (isLoading) {
    return <div className="loading-screen">読み込み中...</div>
  }

  if (error) {
    return <div className="error-screen">データの読み込みに失敗しました: {error}</div>
  }

  return (
    <div className="home-screen">
      <h1>プロジェクト一覧</h1>

      {projects.length === 0 && !showAddForm && (
        <p className="empty-message">プロジェクトはまだありません</p>
      )}

      <ul className="project-list">
        {projects.map((project: Project) => (
          <li key={project.id} className="project-card" onClick={() => onNavigateToProject(project.id)}>
            <span className="project-name">{project.name}</span>
          </li>
        ))}

        {showAddForm ? (
          <li className="project-add-form">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="プロジェクト名"
            />
            <button onClick={handleConfirm}>追加</button>
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
