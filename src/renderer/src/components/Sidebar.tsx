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
import { NavLink, Stack, Text, Tooltip, UnstyledButton, ScrollArea, Box, Divider } from '@mantine/core'
import {
  IconFolder,
  IconHome,
  IconSettings,
  IconInfoCircle,
  IconMenu2
} from '@tabler/icons-react'
import type { Project } from '../types'
import iconWide from '../assets/icon-wide.png'

export type View =
  | { type: 'home' }
  | { type: 'project'; projectId: string }
  | { type: 'task'; projectId: string; taskId: string }
  | { type: 'settings' }

type Props = {
  collapsed: boolean
  onToggleCollapse: () => void
  currentView: View
  projects: Project[]
  onNavigate: (view: View) => void
  onAboutOpen: () => void
}

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

  const folderIcon = (
    <span
      {...attributes}
      {...listeners}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', display: 'flex', alignItems: 'center' }}
    >
      <IconFolder size={16} stroke={1.5} />
    </span>
  )

  const navLink = (
    <NavLink
      label={!collapsed ? project.name : undefined}
      leftSection={folderIcon}
      active={active}
      onClick={() => onNavigate({ type: 'project', projectId: project.id })}
      title={project.name}
      styles={{
        root: { borderRadius: 6, justifyContent: collapsed ? 'center' : undefined },
        ...(collapsed && { section: { margin: 0 } })
      }}
    />
  )

  return (
    <div ref={setNodeRef} style={style}>
      {collapsed ? (
        <Tooltip label={project.name} position="right" withArrow>
          {navLink}
        </Tooltip>
      ) : navLink}
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggleCollapse, currentView, projects, onNavigate, onAboutOpen }: Props): JSX.Element {
  const [orderedProjects, setOrderedProjects] = useState<Project[]>(() =>
    applySavedOrder(projects, loadOrder())
  )

  useEffect(() => {
    setOrderedProjects((prev) => {
      const savedIds = prev.map((p) => p.id)
      return applySavedOrder(projects, savedIds)
    })
  }, [projects])

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
    <Box
      className="sidebar-mantine"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--mantine-color-dark-5)',
        background: 'var(--mantine-color-dark-8)'
      }}
    >
      {/* Toggle button */}
      <Box p="xs" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
        <Tooltip label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'} position="right" withArrow disabled={!collapsed}>
          <UnstyledButton
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8,
              padding: '4px 6px',
              borderRadius: 6,
              color: 'var(--mantine-color-dark-2)'
            }}
          >
            <IconMenu2 size={18} stroke={1.5} style={{ flexShrink: 0 }} />
            {!collapsed && (
              <img src={iconWide} alt="Laurel" style={{ height: 18, width: 'auto', display: 'block' }} />
            )}
          </UnstyledButton>
        </Tooltip>
      </Box>

      {/* Nav items */}
      <ScrollArea style={{ flex: 1 }} p="xs">
        <Stack gap={2}>
          {/* Home */}
          {collapsed ? (
            <Tooltip label="Home" position="right" withArrow>
              <NavLink
                leftSection={<IconHome size={16} stroke={1.5} />}
                active={isActive({ type: 'home' })}
                onClick={() => onNavigate({ type: 'home' })}
                styles={{ root: { borderRadius: 6, justifyContent: 'center' }, section: { margin: 0 } }}
              />
            </Tooltip>
          ) : (
            <NavLink
              label="Home"
              leftSection={<IconHome size={16} stroke={1.5} />}
              active={isActive({ type: 'home' })}
              onClick={() => onNavigate({ type: 'home' })}
              styles={{ root: { borderRadius: 6 } }}
            />
          )}

          {/* Projects section */}
          {!collapsed && (
            <Text size="xs" c="dimmed" px={8} mt={8} mb={2} fw={600} tt="uppercase" style={{ letterSpacing: '0.05em' }}>
              プロジェクト
            </Text>
          )}
          {collapsed && <Divider my={4} />}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedProjects.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack gap={2}>
                {orderedProjects.map((p) => (
                  <SortableProjectItem
                    key={p.id}
                    project={p}
                    active={isActive({ type: 'project', projectId: p.id })}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        </Stack>
      </ScrollArea>

      {/* Footer */}
      <Box p="xs" style={{ borderTop: '1px solid var(--mantine-color-dark-5)' }}>
        <Stack gap={2}>
          {collapsed ? (
            <>
              <Tooltip label="Settings" position="right" withArrow>
                <NavLink
                  leftSection={<IconSettings size={16} stroke={1.5} />}
                  active={isActive({ type: 'settings' })}
                  onClick={() => onNavigate({ type: 'settings' })}
                  styles={{ root: { borderRadius: 6, justifyContent: 'center' }, section: { margin: 0 } }}
                />
              </Tooltip>
              <Tooltip label="About" position="right" withArrow>
                <NavLink
                  leftSection={<IconInfoCircle size={16} stroke={1.5} />}
                  onClick={onAboutOpen}
                  styles={{ root: { borderRadius: 6, justifyContent: 'center' }, section: { margin: 0 } }}
                />
              </Tooltip>
            </>
          ) : (
            <>
              <NavLink
                label="Settings"
                leftSection={<IconSettings size={16} stroke={1.5} />}
                active={isActive({ type: 'settings' })}
                onClick={() => onNavigate({ type: 'settings' })}
                styles={{ root: { borderRadius: 6 } }}
              />
              <NavLink
                label="About"
                leftSection={<IconInfoCircle size={16} stroke={1.5} />}
                onClick={onAboutOpen}
                styles={{ root: { borderRadius: 6 } }}
              />
            </>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
