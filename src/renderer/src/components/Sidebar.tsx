import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Project } from '../types'

export type View =
  | { type: 'home' }
  | { type: 'project'; projectId: string }
  | { type: 'task'; projectId: string; taskId: string }
  | { type: 'settings' }

type Props = {
  currentView: View
  projects: Project[]
  onNavigate: (view: View) => void
  onAboutOpen: () => void
}

const COLLAPSED_KEY = 'sidebar-collapsed'
const ORDER_KEY = 'project-order'

function loadOrder(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveOrder(ids: string[]): void {
  localStorage.setItem(ORDER_KEY, JSON.stringify(ids))
}

function applySavedOrder(projects: Project[], savedIds: string[]): Project[] {
  const map = new Map(projects.map((p) => [p.id, p]))
  const ordered: Project[] = []
  for (const id of savedIds) {
    if (map.has(id)) {
      ordered.push(map.get(id)!)
      map.delete(id)
    }
  }
  // Append any projects not yet in saved order (new projects)
  for (const p of map.values()) ordered.push(p)
  return ordered
}

// ── SortableProjectItem ────────────────────────────────────────────────────────

type ItemProps = {
  project: Project
  active: boolean
  collapsed: boolean
  onNavigate: (view: View) => void
}

function SortableProjectItem({ project, active, collapsed, onNavigate }: ItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sidebar-project-row${isDragging ? ' sidebar-project-row--dragging' : ''}`}
    >
      {!collapsed && (
        <button
          className="sidebar-project-drag"
          {...attributes}
          {...listeners}
          tabIndex={-1}
          aria-label="並べ替え"
        >
          ⠿
        </button>
      )}
      <button
        className={`sidebar-item sidebar-item--project ${active ? 'sidebar-item--active' : ''}`}
        onClick={() => onNavigate({ type: 'project', projectId: project.id })}
        title={project.name}
      >
        <span className="sidebar-icon">📁</span>
        {!collapsed && <span className="sidebar-label">{project.name}</span>}
      </button>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

export function Sidebar({ currentView, projects, onNavigate, onAboutOpen }: Props): JSX.Element {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  })
  const [orderedProjects, setOrderedProjects] = useState<Project[]>(() =>
    applySavedOrder(projects, loadOrder())
  )

  // Sync when projects list changes (add/remove)
  useEffect(() => {
    setOrderedProjects((prev) => {
      const savedIds = prev.map((p) => p.id)
      return applySavedOrder(projects, savedIds)
    })
  }, [projects])

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrderedProjects((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id)
      const newIndex = prev.findIndex((p) => p.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      saveOrder(next.map((p) => p.id))
      return next
    })
  }

  const isActive = (view: View): boolean => {
    if (view.type === 'home' && currentView.type === 'home') return true
    if (view.type === 'settings' && currentView.type === 'settings') return true
    if (
      view.type === 'project' &&
      (currentView.type === 'project' || currentView.type === 'task') &&
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedProjects.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="sidebar-project-list">
              {orderedProjects.map((p) => (
                <SortableProjectItem
                  key={p.id}
                  project={p}
                  active={isActive({ type: 'project', projectId: p.id })}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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