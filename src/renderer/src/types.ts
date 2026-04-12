export type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'done'

export type MailData = {
  link: string
  meta: { id: string; internetMessageId: string; conversationId: string }
  datetime: { received: string }
  subject: string
  importance: string
  from: string
  to: string
  cc: string
  bcc: string
  replyTo: string
  body: string
  flags: { hasAttachments: string }
}

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
  startAt: string | null
  completedAt: string | null
  description: string | null
  mailData: MailData | null
  isCheckpoint: boolean
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
  taskId: string | null
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