import type { TaskStatus } from '../types'

export const STATUS_COLORS: Record<TaskStatus, string> = {
  'todo': 'blue',
  'in-progress': 'green',
  'in-review': 'orange',
  'done': 'gray'
}

export const STATUS_BAR_COLORS: Record<TaskStatus, string> = {
  'todo': 'var(--mantine-color-blue-6)',
  'in-progress': 'var(--mantine-color-green-6)',
  'in-review': 'var(--mantine-color-orange-6)',
  'done': 'var(--mantine-color-gray-6)'
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  'todo': 'To Do',
  'in-progress': 'WIP',
  'in-review': 'In Review',
  'done': 'Done'
}

export const ALL_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'in-review', 'done']

export const GANTT_MARKER_COLORS = {
  occurred: 'var(--mantine-color-yellow-6)',
  dueDate: 'var(--mantine-color-red-6)',
  completed: 'var(--mantine-color-teal-6)'
} as const
