export type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'done'

export type Genre = {
  name: string
  color: string
}

export type Project = {
  id: string
  name: string
  createdAt: string
}

export type Task = {
  id: string
  projectId: string
  parentId: string | null
  title: string
  status: TaskStatus
  genre: string | null
  tags: string[]
  createdAt: string
  order: number
}