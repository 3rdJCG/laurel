import { useState, useRef, useEffect } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useData } from '../context/DataContext'
import { TaskItem } from '../components/TaskItem'
import { IssuesTab } from '../components/IssuesTab'

type Props = {
  projectId: string
  taskId: string
  onNavigateBack: () => void
}

type Tab = 'tasks' | 'issues'

export function TaskDetailScreen({ projectId, taskId, onNavigateBack }: Props): JSX.Element {
  const { projects, tasksByProject, updateTask, createTask } = useData()
  const [activeTab, setActiveTab] = useState<Tab>('tasks')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`laurel:expand:detail:${taskId}`)
    return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>()
  })
  const [showSubtaskForm, setShowSubtaskForm] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [openIssueCount, setOpenIssueCount] = useState(0)
  const subtaskRef = useRef<HTMLInputElement>(null)

  const project = projects.find((p) => p.id === projectId)
  const allTasks = tasksByProject[projectId] ?? []
  const task = allTasks.find((t) => t.id === taskId)

  // Subtasks (children of this root task)
  const childTasks = allTasks
    .filter((t) => t.parentId === taskId)
    .sort((a, b) => a.order - b.order)

  useEffect(() => {
    if (showSubtaskForm) subtaskRef.current?.focus()
  }, [showSubtaskForm])

  const handleToggleExpand = (id: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(`laurel:expand:detail:${taskId}`, JSON.stringify([...next]))
      return next
    })
  }

  const handleChildDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = childTasks.findIndex((t) => t.id === active.id)
    const newIndex = childTasks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(childTasks, oldIndex, newIndex)
    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].order !== i) {
          await updateTask(reordered[i].projectId, reordered[i].id, { order: i })
        }
      }
    } catch (err) {
      setSaveError(String(err))
    }
  }

  const handleAddSubtask = async (): Promise<void> => {
    const title = subtaskTitle.trim()
    if (!title || !task) return
    try {
      await createTask(projectId, taskId, title, task)
      setSaveError(null)
    } catch (err) {
      setSaveError(String(err))
    }
    setSubtaskTitle('')
    setShowSubtaskForm(false)
  }

  const handleSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleAddSubtask()
    if (e.key === 'Escape') {
      setSubtaskTitle('')
      setShowSubtaskForm(false)
    }
  }

  if (!task) {
    return (
      <div className="repo-view">
        <p>タスクが見つかりません</p>
        <button onClick={onNavigateBack}>戻る</button>
      </div>
    )
  }

  return (
    <div className="repo-view">
      {/* Breadcrumb header */}
      <header className="repo-header">
        <button className="repo-back-btn" onClick={onNavigateBack}>← 戻る</button>
        <div className="repo-breadcrumb">
          <span className="repo-project-name">{project?.name ?? projectId}</span>
          <span className="repo-slash"> / </span>
          <span className="repo-task-name">{task.title}</span>
        </div>
      </header>

      {/* Tab bar */}
      <div className="repo-tabs">
        <button
          className={`repo-tab ${activeTab === 'tasks' ? 'repo-tab--active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
        <button
          className={`repo-tab ${activeTab === 'issues' ? 'repo-tab--active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          Issues
          {openIssueCount > 0 && (
            <span className="repo-tab-count">{openIssueCount}</span>
          )}
        </button>
      </div>

      <div className="repo-tab-content">
        {activeTab === 'tasks' ? (
          <div className="repo-tasks-panel">
            {saveError && (
              <div className="error-message" style={{ marginBottom: 8 }}>{saveError}</div>
            )}

            <div className="task-list">
              {/* The root task itself as a TaskItem (non-draggable wrapper) */}
              <DndContext collisionDetection={closestCenter} onDragEnd={handleChildDragEnd}>
                <SortableContext items={childTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <TaskItem
                    key={task.id}
                    task={task}
                    depth={0}
                    allTasks={allTasks}
                    editingTaskId={editingTaskId}
                    onEditStart={(id) => setEditingTaskId(id)}
                    onEditEnd={() => setEditingTaskId(null)}
                    onSaveError={(msg) => setSaveError(msg)}
                    expandedIds={expandedIds}
                    onToggleExpand={handleToggleExpand}
                  />
                </SortableContext>
              </DndContext>

              {/* Add subtask form */}
              {showSubtaskForm ? (
                <div className="subtask-form" style={{ marginLeft: 12 }}>
                  <input
                    ref={subtaskRef}
                    type="text"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    onKeyDown={handleSubtaskKeyDown}
                    placeholder="サブタスク名"
                  />
                  <button onClick={handleAddSubtask}>追加</button>
                  <button onClick={() => { setSubtaskTitle(''); setShowSubtaskForm(false) }}>キャンセル</button>
                </div>
              ) : (
                <button className="add-task-btn" onClick={() => setShowSubtaskForm(true)}>
                  ＋ サブタスクを追加
                </button>
              )}
            </div>
          </div>
        ) : (
          <IssuesTab
            projectId={projectId}
            taskId={taskId}
            onOpenCountChange={setOpenIssueCount}
          />
        )}
      </div>
    </div>
  )
}
