import { useData } from '../context/DataContext'
import type { Task } from '../types'

type Props = {
  projectId: string
  onNavigateHome: () => void
}

export function ProjectScreen({ projectId, onNavigateHome }: Props): JSX.Element {
  const { projects, tasksByProject } = useData()
  const project = projects.find((p) => p.id === projectId)
  const tasks = tasksByProject[projectId] ?? []

  if (!project) {
    return (
      <div className="project-screen">
        <button onClick={onNavigateHome}>← ホーム</button>
        <p>プロジェクトが見つかりません</p>
      </div>
    )
  }

  const rootTasks = tasks
    .filter((t: Task) => t.parentId === null)
    .sort((a: Task, b: Task) => a.order - b.order)

  return (
    <div className="project-screen">
      <header className="project-header">
        <button className="back-btn" onClick={onNavigateHome}>
          ← ホーム
        </button>
        <h1>{project.name}</h1>
      </header>

      <div className="task-list">
        {rootTasks.length === 0 ? (
          <p className="empty-message">タスクはまだありません</p>
        ) : (
          <ul>
            {rootTasks.map((task: Task) => (
              <li key={task.id} className="task-item">
                <span className={`task-status task-status--${task.status}`}>{task.status}</span>
                <span className="task-title">{task.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
