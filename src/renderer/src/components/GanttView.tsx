import { useCallback, useMemo, useRef, useState } from 'react'
import { ActionIcon, Menu, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconChevronRight, IconFlag, IconArrowUp, IconArrowDown, IconGripVertical } from '@tabler/icons-react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Genre, Task, TaskStatus } from '../types'

// ── 定数 ──────────────────────────────────────────────────────────────────────

const DAY_WIDTH = 28
const ROW_HEIGHT = 36
const HEADER_HEIGHT = 48 // month row (24px) + day row (24px)
const MS_PER_DAY = 86400000

// ── ユーティリティ ───────────────────────────────────────────��─────────────────

const STATUS_BAR_COLORS: Record<TaskStatus, string> = {
  todo: 'var(--mantine-color-gray-6)',
  'in-progress': 'var(--mantine-color-blue-6)',
  'in-review': 'var(--mantine-color-orange-6)',
  done: 'var(--mantine-color-teal-7)'
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'WIP',
  'in-review': 'In Review',
  done: 'Done'
}

const ALL_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'in-review', 'done']

const DEPTH_ROW_COLORS = [
  'rgba(255,255,255,0.08)',  // depth 0: ルートタスク（明るい）
  'rgba(255,255,255,0.04)',  // depth 1: Phase
  'rgba(0,0,0,0.04)',        // depth 2: サブタスク
  'rgba(0,0,0,0.10)'         // depth 3+（暗い）
]

function toDay(dateStr: string): Date {
  const d = new Date(dateStr.slice(0, 10))
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type VisibleRow =
  | { kind: 'genre-header'; genre: string; genreKey: string; color: string }
  | { kind: 'task'; task: Task; depth: number }

function buildVisibleRows(
  tasks: Task[],
  expandedIds: Set<string>,
  genres: Genre[]
): VisibleRow[] {
  const rows: VisibleRow[] = []

  function visitChildren(parentId: string, depth: number): void {
    tasks
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .forEach((task) => {
        rows.push({ kind: 'task', task, depth })
        if (expandedIds.has(task.id)) {
          visitChildren(task.id, depth + 1)
        }
      })
  }

  // ルートタスクをジャンル別にグルーピング
  const rootTasks = tasks.filter((t) => t.parentId === null).sort((a, b) => a.order - b.order)
  const genreGroups = new Map<string, Task[]>()

  for (const task of rootTasks) {
    const key = task.genre ?? ''
    if (!genreGroups.has(key)) genreGroups.set(key, [])
    genreGroups.get(key)!.push(task)
  }

  // ジャンル定義順 → 未設定の順で並べる
  const genreOrder = genres.map((g) => g.name)
  const sortedKeys = [...genreGroups.keys()].sort((a, b) => {
    if (a === '') return 1
    if (b === '') return -1
    const ai = genreOrder.indexOf(a)
    const bi = genreOrder.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  for (const key of sortedKeys) {
    const genreDef = genres.find((g) => g.name === key)
    rows.push({
      kind: 'genre-header',
      genre: key || '未分類',
      genreKey: key,
      color: genreDef?.color ?? '#6b7280'
    })
    for (const task of genreGroups.get(key)!) {
      rows.push({ kind: 'task', task, depth: 0 })
      if (expandedIds.has(task.id)) {
        visitChildren(task.id, 1)
      }
    }
  }

  return rows
}

function calcDateRange(
  tasks: Task[],
  today: Date
): { startDate: Date; totalDays: number } {
  const allDates: Date[] = [today]

  for (const t of tasks) {
    if (t.occurredAt) allDates.push(toDay(t.occurredAt))
    if (t.startAt) allDates.push(toDay(t.startAt))
    if (t.dueAt) allDates.push(toDay(t.dueAt))
    if (t.completedAt) allDates.push(toDay(t.completedAt))
    if (t.createdAt) allDates.push(toDay(t.createdAt))
  }

  const minMs = Math.min(...allDates.map((d) => d.getTime()))
  const maxMs = Math.max(...allDates.map((d) => d.getTime()))

  const startDate = new Date(minMs)
  startDate.setDate(startDate.getDate() - 7)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(maxMs)
  endDate.setDate(endDate.getDate() + 14)
  endDate.setHours(0, 0, 0, 0)

  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1

  return { startDate, totalDays }
}

function buildMonthSpans(
  startDate: Date,
  totalDays: number
): Array<{ label: string; days: number }> {
  const spans: Array<{ label: string; days: number }> = []
  let cur = new Date(startDate)
  let remaining = totalDays

  while (remaining > 0) {
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    monthEnd.setHours(0, 0, 0, 0)
    const daysInSpan = Math.min(
      remaining,
      Math.round((monthEnd.getTime() - cur.getTime()) / MS_PER_DAY)
    )
    spans.push({
      label: `${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}`,
      days: daysInSpan
    })
    cur = monthEnd
    remaining -= daysInSpan
  }

  return spans
}

// ── ドラッグ対象の種別 ────────────────────────────────────────────────────────

type DragTarget =
  | { kind: 'marker'; field: 'occurredAt' | 'dueAt' | 'completedAt' }
  | { kind: 'bar-move' }
  | { kind: 'bar-left' }
  | { kind: 'bar-right' }

type DragState = {
  taskId: string
  projectId: string
  target: DragTarget
  startX: number
  originDates: { startAt: string | null; completedAt: string | null; occurredAt: string | null; dueAt: string | null }
}

// ── 要素情報 ─────────────────────────────────────────────────────────────────

type GanttElement =
  | { kind: 'bar'; leftPx: number; widthPx: number; anchored: boolean }
  | { kind: 'marker'; centerPx: number; color: string; label: string; field: 'occurredAt' | 'dueAt' | 'completedAt' }

type BarInfo = { elements: GanttElement[] }

function getBarInfo(task: Task, today: Date, startDate: Date): BarInfo {
  const dayOffset = (d: Date): number =>
    Math.round((d.getTime() - startDate.getTime()) / MS_PER_DAY)
  const elements: GanttElement[] = []

  // 発生日マーカー
  if (task.occurredAt) {
    const d = toDay(task.occurredAt)
    elements.push({
      kind: 'marker',
      centerPx: (dayOffset(d) + 0.5) * DAY_WIDTH,
      color: 'var(--mantine-color-yellow-6)',
      label: '発生',
      field: 'occurredAt'
    })
  }

  // 期限日マーカー
  if (task.dueAt) {
    const d = toDay(task.dueAt)
    elements.push({
      kind: 'marker',
      centerPx: (dayOffset(d) + 0.5) * DAY_WIDTH,
      color: 'var(--mantine-color-red-6)',
      label: '期限',
      field: 'dueAt'
    })
  }

  // 着手日〜完了日バー
  if (task.startAt && task.completedAt) {
    const s = toDay(task.startAt)
    const e = toDay(task.completedAt)
    const left = dayOffset(s) * DAY_WIDTH
    const width = Math.max((dayOffset(e) - dayOffset(s) + 1) * DAY_WIDTH, DAY_WIDTH)
    elements.push({ kind: 'bar', leftPx: left, widthPx: width, anchored: false })
  } else if (task.startAt && !task.completedAt) {
    const s = toDay(task.startAt)
    const left = dayOffset(s) * DAY_WIDTH
    const width = Math.max((dayOffset(today) - dayOffset(s) + 1) * DAY_WIDTH, DAY_WIDTH)
    elements.push({ kind: 'bar', leftPx: left, widthPx: width, anchored: true })
  } else if (!task.startAt && task.completedAt) {
    const d = toDay(task.completedAt)
    elements.push({
      kind: 'marker',
      centerPx: (dayOffset(d) + 0.5) * DAY_WIDTH,
      color: 'var(--mantine-color-teal-6)',
      label: '完了',
      field: 'completedAt'
    })
  }

  return { elements }
}

// ── SortableTaskRow（左パネル用・D&D対応） ──────────────────────────────────

type SortableTaskRowProps = {
  task: Task
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  onToggleExpand: (taskId: string) => void
  onNavigate: (taskId: string) => void
  onUpdateTask: (projectId: string, taskId: string, changes: Partial<Task>) => Promise<void>
}

function SortableTaskRow({
  task,
  depth,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onNavigate,
  onUpdateTask
}: SortableTaskRowProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    paddingLeft: 4,
    background: DEPTH_ROW_COLORS[Math.min(depth, DEPTH_ROW_COLORS.length - 1)]
  }

  return (
    <div
      ref={setNodeRef}
      className="gantt-left-row"
      style={style}
      onClick={() => onNavigate(task.id)}
      title={task.title}
    >
      <UnstyledButton
        className="gantt-drag-handle"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label="ドラッグ"
      >
        <IconGripVertical size={12} stroke={1.5} />
      </UnstyledButton>
      {depth > 0 && (
        <span style={{ display: 'inline-block', width: depth * 12, flexShrink: 0 }} />
      )}
      {hasChildren ? (
        <ActionIcon
          variant="subtle"
          size="xs"
          color="gray"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(task.id)
          }}
          style={{ flexShrink: 0 }}
        >
          {isExpanded ? (
            <IconChevronDown size={12} stroke={2} />
          ) : (
            <IconChevronRight size={12} stroke={2} />
          )}
        </ActionIcon>
      ) : (
        <span style={{ display: 'inline-block', width: 22, flexShrink: 0 }} />
      )}
      {task.isCheckpoint && (
        <IconFlag size={10} stroke={2} color="var(--mantine-color-violet-5)" style={{ flexShrink: 0, marginRight: 2 }} />
      )}
      <span
        style={{
          fontSize: 12,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: task.status === 'done'
            ? 'var(--mantine-color-dark-3)'
            : 'var(--mantine-color-dark-0)'
        }}
      >
        {task.title}
      </span>
      <Menu shadow="md" width={120} position="bottom-end" withinPortal>
        <Menu.Target>
          <span
            className="gantt-status-badge gantt-status-badge--clickable"
            style={{ backgroundColor: STATUS_BAR_COLORS[task.status] }}
            title={STATUS_LABELS[task.status]}
            onClick={(e) => e.stopPropagation()}
          >
            {STATUS_LABELS[task.status]}
          </span>
        </Menu.Target>
        <Menu.Dropdown>
          {ALL_STATUSES.map((s) => (
            <Menu.Item
              key={s}
              disabled={s === task.status}
              onClick={(e) => {
                e.stopPropagation()
                onUpdateTask(task.projectId, task.id, { status: s })
              }}
              leftSection={
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: STATUS_BAR_COLORS[s]
                  }}
                />
              }
            >
              <Text size="xs">{STATUS_LABELS[s]}</Text>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </div>
  )
}

// ── Props ──────────��─────────────────────────────��────────────────────────────

type Props = {
  tasks: Task[]
  genres: Genre[]
  expandedIds: Set<string>
  onToggleExpand: (taskId: string) => void
  onNavigate: (taskId: string) => void
  onUpdateTask: (projectId: string, taskId: string, changes: Partial<Task>) => Promise<void>
  onReorderGenres: (genres: Genre[]) => void
}

// ── Component ──────────────���───────────────────────────────────��──────────────

export function GanttView({ tasks, genres, expandedIds, onToggleExpand, onNavigate, onUpdateTask, onReorderGenres }: Props): JSX.Element {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const { startDate, totalDays } = useMemo(
    () => calcDateRange(tasks, today),
    [tasks, today]
  )

  const visibleRows = useMemo(
    () => buildVisibleRows(tasks, expandedIds, genres),
    [tasks, expandedIds, genres]
  )

  const monthSpans = useMemo(
    () => buildMonthSpans(startDate, totalDays),
    [startDate, totalDays]
  )

  const dayColumns = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [startDate, totalDays])

  const todayOffsetPx =
    Math.round((today.getTime() - startDate.getTime()) / MS_PER_DAY) * DAY_WIDTH +
    DAY_WIDTH / 2

  const totalWidthPx = totalDays * DAY_WIDTH

  const weekendIndices = useMemo(
    () => dayColumns.reduce<number[]>((acc, d, i) => {
      if (d.getDay() === 0 || d.getDay() === 6) acc.push(i)
      return acc
    }, []),
    [dayColumns]
  )

  // ── ドラッグ状態管理 ─���───────────────────────────────────────────────────────

  const dragRef = useRef<DragState | null>(null)
  const [dragDelta, setDragDelta] = useState<{ taskId: string; deltadays: number } | null>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, task: Task, target: DragTarget) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = {
        taskId: task.id,
        projectId: task.projectId,
        target,
        startX: e.clientX,
        originDates: {
          startAt: task.startAt,
          completedAt: task.completedAt,
          occurredAt: task.occurredAt,
          dueAt: task.dueAt
        }
      }
      setDragDelta(null)
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const deltaDays = Math.round(dx / DAY_WIDTH)
      setDragDelta({ taskId: drag.taskId, deltadays: deltaDays })
    },
    []
  )

  const handleMouseUp = useCallback(
    async () => {
      const drag = dragRef.current
      const delta = dragDelta
      dragRef.current = null
      setDragDelta(null)

      if (!drag || !delta || delta.deltadays === 0) return

      const shiftDate = (dateStr: string | null, days: number): string | null => {
        if (!dateStr) return null
        const d = toDay(dateStr)
        d.setDate(d.getDate() + days)
        return toDateStr(d)
      }

      const { target, originDates } = drag
      let changes: Partial<Task> = {}

      if (target.kind === 'marker') {
        changes[target.field] = shiftDate(originDates[target.field], delta.deltadays)
      } else if (target.kind === 'bar-move') {
        changes.startAt = shiftDate(originDates.startAt, delta.deltadays)
        changes.completedAt = shiftDate(originDates.completedAt, delta.deltadays)
      } else if (target.kind === 'bar-left') {
        changes.startAt = shiftDate(originDates.startAt, delta.deltadays)
      } else if (target.kind === 'bar-right') {
        const base = originDates.completedAt ?? toDateStr(today)
        changes.completedAt = shiftDate(base, delta.deltadays)
      }

      try {
        await onUpdateTask(drag.projectId, drag.taskId, changes)
      } catch {
        // revert silently — state will stay as-is
      }
    },
    [dragDelta, onUpdateTask, today]
  )

  const handleMouseLeave = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = null
      setDragDelta(null)
    }
  }, [])

  // ── ドラッグ中のプレビュー位置を計算 ──────────────────────────────────────────

  const getPreviewBarInfo = useCallback(
    (task: Task): BarInfo => {
      if (!dragDelta || dragDelta.taskId !== task.id || !dragRef.current) {
        return getBarInfo(task, today, startDate)
      }

      const drag = dragRef.current
      const { target, originDates } = drag
      const dd = dragDelta.deltadays

      const shiftDate = (dateStr: string | null, days: number): string | null => {
        if (!dateStr) return null
        const d = toDay(dateStr)
        d.setDate(d.getDate() + days)
        return toDateStr(d)
      }

      // ドラッグ中の仮の日付でタスクをシミュレート
      let previewTask: Task
      if (target.kind === 'marker') {
        previewTask = { ...task, [target.field]: shiftDate(originDates[target.field], dd) }
      } else if (target.kind === 'bar-move') {
        previewTask = {
          ...task,
          startAt: shiftDate(originDates.startAt, dd),
          completedAt: shiftDate(originDates.completedAt, dd)
        }
      } else if (target.kind === 'bar-left') {
        previewTask = { ...task, startAt: shiftDate(originDates.startAt, dd) }
      } else if (target.kind === 'bar-right') {
        const base = originDates.completedAt ?? toDateStr(today)
        previewTask = { ...task, completedAt: shiftDate(base, dd) }
      } else {
        previewTask = task
      }

      return getBarInfo(previewTask, today, startDate)
    },
    [dragDelta, today, startDate]
  )

  // ── ジャンル並び替え ──────────────────────────────────────────────────────────

  /** ジャンル別にグループ化したルートタスクのキー順 */
  const sortedGenreKeys = useMemo(() => {
    const rootTasks = tasks.filter((t) => t.parentId === null)
    const keys = new Set<string>()
    rootTasks.forEach((t) => keys.add(t.genre ?? ''))
    const genreOrder = genres.map((g) => g.name)
    return [...keys].sort((a, b) => {
      if (a === '') return 1
      if (b === '') return -1
      const ai = genreOrder.indexOf(a)
      const bi = genreOrder.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [tasks, genres])

  /** ルートタスク全体の order をジャンルグループ順に振り直す */
  const reassignRootOrders = useCallback(
    async (genreKeys: string[]) => {
      const rootTasks = tasks.filter((t) => t.parentId === null)
      const byGenre = new Map<string, Task[]>()
      for (const t of rootTasks) {
        const key = t.genre ?? ''
        if (!byGenre.has(key)) byGenre.set(key, [])
        byGenre.get(key)!.push(t)
      }
      for (const arr of byGenre.values()) arr.sort((a, b) => a.order - b.order)

      let order = 0
      for (const key of genreKeys) {
        for (const t of byGenre.get(key) ?? []) {
          if (t.order !== order) {
            await onUpdateTask(t.projectId, t.id, { order })
          }
          order++
        }
      }
    },
    [tasks, onUpdateTask]
  )

  const handleGenreMove = useCallback(
    async (genreKey: string, direction: -1 | 1) => {
      const idx = sortedGenreKeys.indexOf(genreKey)
      if (idx === -1) return
      const targetIdx = idx + direction
      if (targetIdx < 0 || targetIdx >= sortedGenreKeys.length) return

      // ジャンルキー配列を入れ替え
      const newKeys = [...sortedGenreKeys]
      ;[newKeys[idx], newKeys[targetIdx]] = [newKeys[targetIdx], newKeys[idx]]

      // genres 設定の並び順も更新（未分類 '' は genres 配列に含まれない）
      const newGenres = newKeys
        .filter((k) => k !== '')
        .map((k) => genres.find((g) => g.name === k) ?? { name: k, color: '#6b7280' })
      // genres 配列に含まれていないジャンルがあれば末尾に残す
      for (const g of genres) {
        if (!newGenres.some((ng) => ng.name === g.name)) newGenres.push(g)
      }
      onReorderGenres(newGenres)

      // ルートタスクの order を新しいジャンル順で振り直す
      await reassignRootOrders(newKeys)
    },
    [sortedGenreKeys, genres, onReorderGenres, reassignRootOrders]
  )

  // ── タスク並び替え（D&D：全階層・親跨ぎ対応） ────────────────────────────────

  const handleTaskDragEnd = useCallback(
    async (event: DragEndEvent): Promise<void> => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeTask = tasks.find((t) => t.id === active.id)
      const overTask = tasks.find((t) => t.id === over.id)
      if (!activeTask || !overTask) return

      // 自分自身・自分の子孫にはドロップ不可（循環防止）
      const isDescendant = (maybeDesc: Task, ancestorId: string): boolean => {
        let cur: Task | undefined = maybeDesc
        while (cur && cur.parentId) {
          if (cur.parentId === ancestorId) return true
          cur = tasks.find((t) => t.id === cur!.parentId)
        }
        return false
      }
      if (isDescendant(overTask, activeTask.id)) return

      // 種別判定: Root / Phase / Subtask の 3 種で階層ルールを強制する
      type TaskKind = 'root' | 'phase' | 'subtask'
      const kindOf = (t: Task): TaskKind =>
        t.parentId === null ? 'root' : t.isCheckpoint ? 'phase' : 'subtask'
      const activeKind = kindOf(activeTask)
      const overKind = kindOf(overTask)

      // 新しい親を種別に応じて決定（不正な組合せは早期 return で拒否）
      let newParentId: string | null
      if (activeKind === 'root') {
        // Root は Root の兄弟にしか置けない
        if (overKind !== 'root') return
        newParentId = null
      } else if (activeKind === 'phase') {
        // Phase を Subtask 配下には置けない（Phase ネスト・Subtask 配下 Phase を禁止）
        if (overKind === 'subtask') return
        // Root にドロップ → その Root の直下、Phase にドロップ → 同じ Root の Phase 兄弟
        newParentId = overKind === 'root' ? overTask.id : overTask.parentId
      } else {
        // Subtask は Root に昇格できない（必ず何かの子）
        if (overKind === 'root') return
        // Phase にドロップ → Phase の子、Subtask にドロップ → その兄弟
        newParentId = overKind === 'phase' ? overTask.id : overTask.parentId
      }

      // ジャンル更新ルール
      // - Root の移動のみ overTask のジャンルを継承
      // - Phase / Subtask は genre を持たないため null
      const newGenre: string | null =
        activeKind === 'root' ? overTask.genre : null

      // 同じ親内で並び替え（単純 reorder）
      // overTask が Phase でも、両者の親が一致していれば同一親内 reorder として扱う
      // （overTask が活性タスクの「親」になるケース ＝ Phase→Root, Subtask→Phase などは
      //   下の親跨ぎ分岐に委ね、末尾挿入する）
      if (
        activeTask.parentId === newParentId &&
        overTask.parentId === newParentId
      ) {
        const siblings = tasks
          .filter((t) => t.parentId === newParentId)
          .sort((a, b) => a.order - b.order)
        const oldIdx = siblings.findIndex((t) => t.id === activeTask.id)
        const newIdx = siblings.findIndex((t) => t.id === overTask.id)
        if (oldIdx === -1 || newIdx === -1) return
        const reordered = arrayMove(siblings, oldIdx, newIdx)
        try {
          for (let i = 0; i < reordered.length; i++) {
            const t = reordered[i]
            const changes: Partial<Task> = {}
            if (t.order !== i) changes.order = i
            if (t.id === activeTask.id && t.genre !== newGenre) changes.genre = newGenre
            if (Object.keys(changes).length > 0) {
              await onUpdateTask(t.projectId, t.id, changes)
            }
          }
        } catch {
          // ignore
        }
        return
      }

      // 親跨ぎの移動
      const newSiblings = tasks
        .filter((t) => t.parentId === newParentId && t.id !== activeTask.id)
        .sort((a, b) => a.order - b.order)

      // 挿入位置の決定
      // - overTask が親そのもの（Phase→Root の Phase 群追加 / Subtask→Phase の子追加）→ 末尾
      // - それ以外 → overTask の位置に挿入（兄弟挿入）
      let insertIdx: number
      if (overTask.id === newParentId) {
        insertIdx = newSiblings.length
      } else {
        insertIdx = newSiblings.findIndex((t) => t.id === overTask.id)
        if (insertIdx === -1) insertIdx = newSiblings.length
      }
      const newReordered = [...newSiblings]
      newReordered.splice(insertIdx, 0, activeTask)

      const oldSiblings = tasks
        .filter((t) => t.parentId === activeTask.parentId && t.id !== activeTask.id)
        .sort((a, b) => a.order - b.order)

      try {
        // 古い親の siblings の order を詰める
        for (let i = 0; i < oldSiblings.length; i++) {
          if (oldSiblings[i].order !== i) {
            await onUpdateTask(oldSiblings[i].projectId, oldSiblings[i].id, { order: i })
          }
        }
        // 新しい親の siblings（activeTask 含む）の order を振り直す
        for (let i = 0; i < newReordered.length; i++) {
          const t = newReordered[i]
          if (t.id === activeTask.id) {
            const changes: Partial<Task> = { order: i }
            if (t.parentId !== newParentId) changes.parentId = newParentId
            if (t.genre !== newGenre) changes.genre = newGenre
            await onUpdateTask(t.projectId, t.id, changes)
          } else if (t.order !== i) {
            await onUpdateTask(t.projectId, t.id, { order: i })
          }
        }
      } catch {
        // ignore
      }
    },
    [tasks, onUpdateTask]
  )

  // ── レンダリング ─────────────────────────────────────────────────────────────

  if (tasks.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text c="dimmed" size="sm">タスクがありません</Text>
      </div>
    )
  }

  const sortableTaskIds = visibleRows
    .filter((r): r is VisibleRow & { kind: 'task' } => r.kind === 'task')
    .map((r) => r.task.id)

  return (
    <div className="gantt-wrapper">
      {/* Left panel */}
      <div className="gantt-left-panel">
        <div className="gantt-left-header">
          <Text size="xs" c="dimmed" style={{ flex: 1 }}>タスク</Text>
          <Text size="xs" c="dimmed" style={{ width: 52, textAlign: 'center', flexShrink: 0 }}>状態</Text>
        </div>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
        <SortableContext items={sortableTaskIds} strategy={verticalListSortingStrategy}>
        {visibleRows.map((row) => {
          if (row.kind === 'genre-header') {
            const genreIdx = sortedGenreKeys.indexOf(row.genreKey)
            const isFirst = genreIdx === 0
            const isLast = genreIdx === sortedGenreKeys.length - 1
            return (
              <div
                key={`genre-${row.genre}`}
                className="gantt-left-row gantt-genre-header"
                style={{ paddingLeft: 8 }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: row.color,
                    flexShrink: 0,
                    marginRight: 6
                  }}
                />
                <Text size="xs" fw={700} style={{ flex: 1 }}>{row.genre}</Text>
                {sortedGenreKeys.length > 1 && (
                  <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                    <ActionIcon
                      variant="subtle"
                      size={18}
                      color="gray"
                      disabled={isFirst}
                      onClick={(e) => { e.stopPropagation(); handleGenreMove(row.genreKey, -1) }}
                      title="上に移動"
                    >
                      <IconArrowUp size={11} stroke={2} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      size={18}
                      color="gray"
                      disabled={isLast}
                      onClick={(e) => { e.stopPropagation(); handleGenreMove(row.genreKey, 1) }}
                      title="下に移動"
                    >
                      <IconArrowDown size={11} stroke={2} />
                    </ActionIcon>
                  </div>
                )}
              </div>
            )
          }

          const { task, depth } = row
          const hasChildren = tasks.some((t) => t.parentId === task.id)
          const isExpanded = expandedIds.has(task.id)

          return (
            <SortableTaskRow
              key={task.id}
              task={task}
              depth={depth}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
              onNavigate={onNavigate}
              onUpdateTask={onUpdateTask}
            />
          )
        })}
        </SortableContext>
        </DndContext>
      </div>

      {/* Right panel */}
      <div
        className="gantt-right-panel"
        style={{ width: totalWidthPx }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="gantt-right-inner" style={{ width: totalWidthPx }}>

          {/* Sticky header */}
          <div className="gantt-header-row" style={{ height: HEADER_HEIGHT }}>
            {/* Month row */}
            <div className="gantt-month-row">
              {monthSpans.map((span, i) => (
                <div
                  key={i}
                  className="gantt-month-cell"
                  style={{ width: span.days * DAY_WIDTH }}
                >
                  {span.label}
                </div>
              ))}
            </div>

            {/* Day row */}
            <div className="gantt-day-row">
              {dayColumns.map((d, i) => {
                const isToday = d.getTime() === today.getTime()
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                return (
                  <div
                    key={i}
                    className={[
                      'gantt-day-cell',
                      isToday ? 'gantt-day-cell--today' : '',
                      isWeekend ? 'gantt-day-cell--weekend' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ width: DAY_WIDTH }}
                  >
                    {d.getDate()}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Weekend stripe layer */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: HEADER_HEIGHT,
              bottom: 0,
              width: totalWidthPx,
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            {weekendIndices.map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: i * DAY_WIDTH,
                  top: 0,
                  bottom: 0,
                  width: DAY_WIDTH,
                  background: 'color-mix(in srgb, var(--mantine-color-dark-6) 30%, transparent)'
                }}
              />
            ))}
          </div>

          {/* Today line */}
          <div
            className="gantt-today-line"
            style={{ left: todayOffsetPx, top: HEADER_HEIGHT }}
          />

          {/* Task rows */}
          {visibleRows.map((row) => {
            if (row.kind === 'genre-header') {
              return (
                <div
                  key={`genre-${row.genre}`}
                  className="gantt-task-row gantt-genre-header"
                  style={{
                    height: ROW_HEIGHT,
                    zIndex: 1,
                    position: 'relative'
                  }}
                />
              )
            }

            const { task, depth } = row
            const bar = getPreviewBarInfo(task)
            const isDragging = dragDelta?.taskId === task.id

            return (
              <div
                key={task.id}
                className="gantt-task-row"
                style={{
                  height: ROW_HEIGHT,
                  zIndex: 1,
                  position: 'relative',
                  background: DEPTH_ROW_COLORS[Math.min(depth, DEPTH_ROW_COLORS.length - 1)]
                }}
              >
                {bar.elements.map((el, i) => {
                  if (el.kind === 'bar') {
                    return (
                      <div
                        key={i}
                        className={`gantt-bar gantt-bar--draggable${el.anchored ? ' gantt-bar--left-anchored' : ''}`}
                        style={{
                          left: el.leftPx,
                          width: el.widthPx,
                          backgroundColor: STATUS_BAR_COLORS[task.status],
                          opacity: isDragging ? 0.7 : undefined
                        }}
                        title={task.title}
                      >
                        {/* 左端リサイズハンドル（着手日） */}
                        <div
                          className="gantt-bar__handle gantt-bar__handle--left"
                          onMouseDown={(e) => handleMouseDown(e, task, { kind: 'bar-left' })}
                        />
                        {/* 中央ドラッグ（バー全体移動） */}
                        <div
                          className="gantt-bar__body"
                          onMouseDown={(e) => handleMouseDown(e, task, { kind: 'bar-move' })}
                        />
                        {/* 右端リサイズハンドル（完了日） */}
                        <div
                          className="gantt-bar__handle gantt-bar__handle--right"
                          onMouseDown={(e) => handleMouseDown(e, task, { kind: 'bar-right' })}
                        />
                      </div>
                    )
                  }
                  return (
                    <div
                      key={i}
                      className="gantt-milestone gantt-milestone--draggable"
                      style={{
                        left: el.centerPx - 7,
                        backgroundColor: el.color,
                        opacity: isDragging ? 0.7 : undefined
                      }}
                      onMouseDown={(e) => handleMouseDown(e, task, { kind: 'marker', field: el.field })}
                      title={`${el.label}: ${task.title}`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
