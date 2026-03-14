import { useEffect, useState } from 'react'
import type { Project } from '../types'

export type View = { type: 'home' } | { type: 'project'; projectId: string } | { type: 'settings' }

type Props = {
  currentView: View
  projects: Project[]
  onNavigate: (view: View) => void
  onAboutOpen: () => void
}

const STORAGE_KEY = 'sidebar-collapsed'

export function Sidebar({ currentView, projects, onNavigate, onAboutOpen }: Props): JSX.Element {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const isActive = (view: View): boolean => {
    if (view.type === 'home' && currentView.type === 'home') return true
    if (view.type === 'settings' && currentView.type === 'settings') return true
    if (
      view.type === 'project' &&
      currentView.type === 'project' &&
      view.projectId === currentView.projectId
    )
      return true
    return false
  }

  return (
    <nav className={`sidebar ${collapsed ? 'sidebar--collapsed' : 'sidebar--expanded'}`}>
      <div className="sidebar-top">
        <button
          className="sidebar-hamburger"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
        >
          ☰
        </button>
      </div>

      <div className="sidebar-nav">
        <button
          className={`sidebar-item ${isActive({ type: 'home' }) ? 'sidebar-item--active' : ''}`}
          onClick={() => onNavigate({ type: 'home' })}
        >
          <span className="sidebar-icon">🏠</span>
          {!collapsed && <span className="sidebar-label">Home</span>}
        </button>

        <div className="sidebar-section-label">{!collapsed && 'プロジェクト'}</div>
        <div className="sidebar-project-list">
          {projects.map((p) => (
            <button
              key={p.id}
              className={`sidebar-item ${isActive({ type: 'project', projectId: p.id }) ? 'sidebar-item--active' : ''}`}
              onClick={() => onNavigate({ type: 'project', projectId: p.id })}
              title={p.name}
            >
              <span className="sidebar-icon">📁</span>
              {!collapsed && <span className="sidebar-label">{p.name}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <button
          className={`sidebar-item ${isActive({ type: 'settings' }) ? 'sidebar-item--active' : ''}`}
          onClick={() => onNavigate({ type: 'settings' })}
        >
          <span className="sidebar-icon">⚙️</span>
          {!collapsed && <span className="sidebar-label">Settings</span>}
        </button>
        <button className="sidebar-item" onClick={onAboutOpen}>
          <span className="sidebar-icon">ℹ️</span>
          {!collapsed && <span className="sidebar-label">About</span>}
        </button>
      </div>
    </nav>
  )
}
