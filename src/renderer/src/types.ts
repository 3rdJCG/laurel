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
  occurredAt: string | null
  dueAt: string | null
}

export type Comment = {
  id: string
  taskId: string
  parentId: string | null
  authorName: string
  authorEmail: string
  body: string
  createdAt: string
}

export type IssueStatus = 'open' | 'closed'

export type IssueComment = {
  id: string
  issueId: string
  authorName: string
  authorEmail: string
  body: string
  createdAt: string
}

export type Issue = {
  id: string
  projectId: string
  taskId: string
  number: number
  title: string
  body: string
  status: IssueStatus
  labels: string[]
  createdAt: string
  closedAt: string | null
  authorName: string
  authorEmail: string
  comments: IssueComment[]
}