import { useCallback, useMemo, useRef, useState } from 'react'
import { ActionIcon, Menu, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconChevronRight, IconFlag, IconArrowUp, IconArrowDown, IconGripVertical } from '@tabler/icons-react'
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Genre, Task } from '../types'
import { STATUS_BAR_COLORS, STATUS_LABELS, ALL_STATUSES, GANTT_MARKER_COLORS } from '../constants/statusColors'

// ── 定数 ──────────────────────────────────────────────────────────────────────

const DAY_WIDTH = 28
const ROW_HEIGHT = 36
const HEADER_HEIGHT = 48 // month row (24px) + day row (24px)
const MS_PER_DAY = 86400000

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
      color: GANTT_MARKER_COLORS.occurred,
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
      color: GANTT_MARKER_COLORS.dueDate,
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
      color: GANTT_MARKER_COLORS.completed,
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
      data-gantt-row-id={task.id}
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

  // ── D&D: ドラッグ開始時点の行矩形スナップショット ───────────────────────────
  // verticalListSortingStrategy はドラッグ中に行を transform でシフトさせるので、
  // DragEnd 時点の getBoundingClientRect は「シフト後」の位置になってしまい、
  // over.id も over.rect もズレた行にヒットしてしまう。
  // そこで DragStart 時点で全行の「動かない本来の矩形」を snapshot しておき、
  // DragEnd ではこちらを使って「ポインタが本来どの行の上にあるか」を判定する。
  const preDragRectsRef = useRef<Map<string, DOMRect>>(new Map())

  const handleDragStart = useCallback((_event: DragStartEvent): void => {
    const map = new Map<string, DOMRect>()
    document.querySelectorAll<HTMLElement>('[data-gantt-row-id]').forEach((el) => {
      const id = el.getAttribute('data-gantt-row-id')
      if (id) map.set(id, el.getBoundingClientRect())
    })
    preDragRectsRef.current = map
  }, [])

  // ── D&D 衝突判定：pointerWithin 優先・rectIntersection フォールバック ──────
  // closestCenter は行の中心距離で判定するため、Phase 境界付近で隣接 Phase の
  // 末尾サブタスク中心のほうが近くなり「入れたつもりが別 Phase に入る」現象が
  // 頻発していた。pointerWithin はポインタ位置ベースなので直感と一致する。
  const ganttCollisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return rectIntersection(args)
  }, [])

  // ── タスク並び替え（D&D：全階層・親跨ぎ対応） ────────────────────────────────

  const handleTaskDragEnd = useCallback(
    async (event: DragEndEvent): Promise<void> => {
      const { active } = event
      const activeTask = tasks.find((t) => t.id === active.id)
      if (!activeTask) return

      // ── ソータブルツリー方式の挿入位置計算 ─────────────────────────────────
      // 個別行ヒットでは verticalListSortingStrategy のシフトに惑わされる。
      // 代わりに「active が可視フラットリストのどの index に収まるか」を
      // 事前 snapshot した矩形（= シフトされない本来の座標系）で計算し、
      // その index の直前行 (prevTask) と直後行 (nextTask) から親と挿入位置を決める。
      //
      // 重要: active が元々あった位置より下の行は、active が抜けた後に
      //   activeHeight だけ上へ詰まる。判定に使う中心 Y は effective 位置
      //   （= origCenter - activeHeight）で比較しないと、同親内の下方向移動が
      //   必ず boundary に引っかかって入れ替わらない。

      const preRects = preDragRectsRef.current
      const { over } = event

      // 同じ行の上で離した場合は何もしない（G3 primary guard）
      if (over && over.id === active.id) return

      // active を含む全可視タスクの並び (元々の順序)
      const fullFlat: Task[] = []
      for (const row of visibleRows) {
        if (row.kind === 'task') fullFlat.push(row.task)
      }
      const activeOrigIdx = fullFlat.findIndex((t) => t.id === activeTask.id)
      if (activeOrigIdx < 0) return

      // active を除いた並び
      const flatVisible: Task[] = fullFlat.filter((t) => t.id !== activeTask.id)

      const activeRect = preRects.get(activeTask.id)
      const activeHeight = activeRect?.height ?? 0

      // DragEnd 時の位置計算は event.delta + 事前 snapshot した矩形を使う。
      // active.rect.current.translated は DragEnd タイミングで null になることが
      // あり、それに依存すると dropCenterY が取れず「必ず末尾に移動」→ジャンル
      // 消失などの致命的バグに直結する。event.delta は開始からの累積移動量で
      // 常に信頼できる。
      const deltaY = event.delta?.y ?? 0
      const dropCenterY =
        activeRect != null ? activeRect.top + deltaY + activeRect.height / 2 : null

      // dropCenterY が取れない場合は安全策として何もしない（破壊的移動を防ぐ）
      if (dropCenterY == null) return

      // 「離した位置が元の位置と同じ」場合は何もしない（G3 / 軽微な誤タップ対策）
      if (activeRect) {
        const activeOrigCenter = activeRect.top + activeRect.height / 2
        if (Math.abs(dropCenterY - activeOrigCenter) < activeHeight / 2) return
      }

      // dropCenterY が最初に「その行の effective 中心より上」になる i を探す。
      // flatVisible[i] が元々 active より下にあった (i >= activeOrigIdx) 行なら
      // 中心を activeHeight 分引き上げて比較する。
      // 境界 (= ちょうど中心) では「その行の上に入れたい」意図を尊重して `<=`。
      let newFlatIdx = flatVisible.length
      for (let i = 0; i < flatVisible.length; i++) {
        const rect = preRects.get(flatVisible[i].id)
        if (!rect) continue
        const wasAfterActive = i >= activeOrigIdx
        const effectiveCenter =
          rect.top + rect.height / 2 - (wasAfterActive ? activeHeight : 0)
        if (dropCenterY <= effectiveCenter) {
          newFlatIdx = i
          break
        }
      }

      let prevTask: Task | undefined = flatVisible[newFlatIdx - 1]
      const nextTask: Task | undefined = flatVisible[newFlatIdx]

      // 種別判定
      type TaskKind = 'root' | 'phase' | 'subtask'
      const kindOf = (t: Task): TaskKind =>
        t.parentId === null ? 'root' : t.isCheckpoint ? 'phase' : 'subtask'
      const activeKind = kindOf(activeTask)

      // 祖先判定（循環防止・first-child 判定両方で使う）
      const isAncestorOf = (ancestorId: string, descendant: Task): boolean => {
        let cur: Task | undefined = descendant
        while (cur && cur.parentId) {
          if (cur.parentId === ancestorId) return true
          cur = tasks.find((t) => t.id === cur!.parentId)
        }
        return false
      }

      // 新しい親の決定:
      // - 直後行が直前行の子孫 → 直前行配下の先頭に挿入 (= prevTask.id)
      // - それ以外 → prevTask の兄弟として挿入 (= prevTask.parentId)
      // - prevTask が無い（先頭）→ nextTask.parentId あるいは root
      let newParentId: string | null
      if (prevTask) {
        if (nextTask && isAncestorOf(prevTask.id, nextTask)) {
          newParentId = prevTask.id
        } else {
          newParentId = prevTask.parentId
        }
      } else {
        newParentId = nextTask?.parentId ?? null
      }

      // 種別に応じた親妥当性
      if (activeKind === 'root') {
        // Root は常に root 直下
        newParentId = null
      } else {
        // Phase / Subtask は root 直下に置けない
        if (newParentId === null) return
      }

      // Phase は Phase の直下にネストしない: Phase 祖先を掘り出して脱出
      if (activeKind === 'phase') {
        while (newParentId) {
          const p = tasks.find((t) => t.id === newParentId)
          if (!p || kindOf(p) !== 'phase') break
          prevTask = p
          newParentId = p.parentId
        }
        if (newParentId === null) return
      }

      // Subtask は「Phase 子を持つコンテナ」の直下に置かない:
      // active が subtask で newParentId が Phase 子を含むなら、適切な Phase 内へ回避する。
      // これが無いと「Phase と subtask が同レベルで混在」という構造違反が発生する (E2)。
      if (activeKind === 'subtask' && newParentId !== null) {
        const containerId = newParentId
        const phaseChildren = tasks
          .filter((t) => t.parentId === containerId && kindOf(t) === 'phase')
          .sort((a, b) => a.order - b.order)
        if (phaseChildren.length > 0) {
          // t から containerId の直接の子まで遡って返す
          const directChildOf = (t: Task): Task | undefined => {
            let cur: Task | undefined = t
            while (cur && cur.parentId !== containerId) {
              cur = cur.parentId ? tasks.find((x) => x.id === cur!.parentId) : undefined
            }
            return cur
          }
          let targetPhase: Task | undefined
          if (prevTask) {
            const pd = directChildOf(prevTask)
            if (pd && kindOf(pd) === 'phase') targetPhase = pd
          }
          if (!targetPhase && nextTask) {
            const nd = directChildOf(nextTask)
            if (nd && kindOf(nd) === 'phase') {
              targetPhase = nd
              prevTask = undefined // nextPhase の先頭子として挿入
            }
          }
          if (!targetPhase) {
            // フォールバック: 最後の Phase の末尾に入れる
            targetPhase = phaseChildren[phaseChildren.length - 1]
            const findLastDescendant = (t: Task): Task => {
              const cs = tasks
                .filter((c) => c.parentId === t.id)
                .sort((a, b) => a.order - b.order)
              return cs.length === 0 ? t : findLastDescendant(cs[cs.length - 1])
            }
            prevTask = findLastDescendant(targetPhase)
          }
          newParentId = targetPhase.id
        }
      }

      // 循環防止: 新しい親が active 自身または active の子孫ならキャンセル
      if (newParentId === activeTask.id) return
      if (newParentId) {
        const maybeNewParent = tasks.find((t) => t.id === newParentId)
        if (maybeNewParent && isAncestorOf(activeTask.id, maybeNewParent)) return
      }

      // 新しい親の子タスク一覧 (active 除外、order 順)
      const targetSiblings = tasks
        .filter((t) => t.parentId === newParentId && t.id !== activeTask.id)
        .sort((a, b) => a.order - b.order)

      // Root 祖先を辿るヘルパー
      const rootAncestorOf = (t: Task): Task | undefined => {
        let cur: Task | undefined = t
        while (cur && cur.parentId) {
          cur = tasks.find((x) => x.id === cur!.parentId)
        }
        return cur
      }

      // 新しい親内での挿入 index
      let insertIdx: number
      if (activeKind === 'root') {
        // Root 挿入: prevTask が非 root の可能性があるので root 祖先で位置決め
        const prevRoot = prevTask ? rootAncestorOf(prevTask) : undefined
        if (prevRoot) {
          const i = targetSiblings.findIndex((t) => t.id === prevRoot.id)
          insertIdx = i >= 0 ? i + 1 : targetSiblings.length
        } else {
          insertIdx = 0
        }
      } else if (prevTask && prevTask.id === newParentId) {
        // prevTask 自身が新親 → 先頭の子として挿入
        insertIdx = 0
      } else if (prevTask && prevTask.parentId === newParentId) {
        const i = targetSiblings.findIndex((t) => t.id === prevTask!.id)
        insertIdx = i >= 0 ? i + 1 : targetSiblings.length
      } else {
        insertIdx = 0
      }

      // ジャンル更新ルール（Root 移動のみ）
      // ドロップ位置がどのジャンルセクション内にあるかを、genre-header の行矩形と
      // タスク行矩形の両方から判定する。これにより:
      //  - 末尾 (prev が前ジャンルの末端行) に落としたときに正しく次ジャンル扱いできる
      //  - 空の「未分類」グループにもドロップで移動できる (H3)
      let newGenre: string | null = null
      if (activeKind === 'root') {
        // 各ジャンルセクションの開始 Y (header top) を収集し、drop 位置が
        // どのセクションに属するかを決定する
        type Section = { key: string; top: number }
        const sections: Section[] = []
        for (const key of sortedGenreKeys) {
          const headerRect = preRects.get(`__genre:${key}`)
          if (headerRect) sections.push({ key, top: headerRect.top })
        }
        sections.sort((a, b) => a.top - b.top)
        // drop 位置より上で最も下にある header が属するセクション
        let targetKey: string | null = null
        for (const s of sections) {
          if (s.top <= dropCenterY) targetKey = s.key
          else break
        }
        if (targetKey === null && sections.length > 0) {
          // drop が最初の header より上にある → 先頭セクション
          targetKey = sections[0].key
        }
        if (targetKey !== null) {
          newGenre = targetKey === '' ? null : targetKey
        } else {
          // フォールバック: 従来の prev/next root ancestor 継承
          const prevRoot = prevTask ? rootAncestorOf(prevTask) : undefined
          const nextRoot = nextTask ? rootAncestorOf(nextTask) : undefined
          newGenre = prevRoot?.genre ?? nextRoot?.genre ?? activeTask.genre ?? null
        }

        // 決定した genre に合うよう insertIdx を補正:
        // targetSiblings は parentId===null の全 root。newGenre に属する
        // root 達の中に挿入する必要がある。prevTask の root 祖先が newGenre 外
        // なら、newGenre グループの先頭または末尾に置く。
        const sameGenreSiblings = targetSiblings.filter(
          (t) => (t.genre ?? null) === newGenre
        )
        if (sameGenreSiblings.length === 0) {
          // 新ジャンル内に他の root が無い → そのジャンルセクションの位置 (= sortedGenreKeys 順) に基づき挿入
          const genreIdx = sortedGenreKeys.indexOf(newGenre ?? '')
          let idx = 0
          for (const sib of targetSiblings) {
            const sibGenreIdx = sortedGenreKeys.indexOf(sib.genre ?? '')
            if (sibGenreIdx < genreIdx) idx++
            else break
          }
          insertIdx = idx
        } else {
          // 新ジャンルにすでに root がある → その中での位置を決定
          const prevRoot = prevTask ? rootAncestorOf(prevTask) : undefined
          if (prevRoot && (prevRoot.genre ?? null) === newGenre) {
            const i = targetSiblings.findIndex((t) => t.id === prevRoot.id)
            insertIdx = i >= 0 ? i + 1 : targetSiblings.length
          } else {
            // prev が新ジャンル外 → 新ジャンルの先頭 root の直前に挿入
            const firstInGenre = sameGenreSiblings[0]
            const i = targetSiblings.findIndex((t) => t.id === firstInGenre.id)
            insertIdx = i >= 0 ? i : 0
          }
        }
      }

      // 同親かつ位置不変なら何もしない
      if (activeTask.parentId === newParentId) {
        const fullSiblings = tasks
          .filter((t) => t.parentId === newParentId)
          .sort((a, b) => a.order - b.order)
        const oldIdx = fullSiblings.findIndex((t) => t.id === activeTask.id)
        // targetSiblings での insertIdx は active を除いた基準なので、
        // fullSiblings 基準に合わせるには active より後ろなら +1
        const oldIdxInTarget = oldIdx
        if (oldIdxInTarget === insertIdx) {
          // ジャンルだけ変わる可能性があるので、そのケースのみ更新
          if (activeKind === 'root' && activeTask.genre !== newGenre) {
            await onUpdateTask(activeTask.projectId, activeTask.id, { genre: newGenre })
          }
          return
        }
      }

      // 同親内でも同親以外でも、arrayMove ではなく
      // 「active を除外した targetSiblings に insertIdx で差し込む」方式で統一する
      const newReordered = [...targetSiblings]
      newReordered.splice(insertIdx, 0, activeTask)

      const oldSiblings =
        activeTask.parentId === newParentId
          ? []
          : tasks
              .filter((t) => t.parentId === activeTask.parentId && t.id !== activeTask.id)
              .sort((a, b) => a.order - b.order)

      try {
        // 旧親の order 詰め直し (親跨ぎのときのみ)
        for (let i = 0; i < oldSiblings.length; i++) {
          if (oldSiblings[i].order !== i) {
            await onUpdateTask(oldSiblings[i].projectId, oldSiblings[i].id, { order: i })
          }
        }
        // 新親の order 振り直し
        for (let i = 0; i < newReordered.length; i++) {
          const t = newReordered[i]
          if (t.id === activeTask.id) {
            const changes: Partial<Task> = { order: i }
            if (t.parentId !== newParentId) changes.parentId = newParentId
            if (activeKind === 'root' && t.genre !== newGenre) changes.genre = newGenre
            await onUpdateTask(t.projectId, t.id, changes)
          } else if (t.order !== i) {
            await onUpdateTask(t.projectId, t.id, { order: i })
          }
        }
      } catch {
        // ignore
      }
    },
    [tasks, onUpdateTask, visibleRows, sortedGenreKeys]
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

        <DndContext
          collisionDetection={ganttCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleTaskDragEnd}
        >
        <SortableContext items={sortableTaskIds} strategy={verticalListSortingStrategy}>
        {visibleRows.map((row) => {
          if (row.kind === 'genre-header') {
            const genreIdx = sortedGenreKeys.indexOf(row.genreKey)
            const isFirst = genreIdx === 0
            const isLast = genreIdx === sortedGenreKeys.length - 1
            return (
              <div
                key={`genre-${row.genre}`}
                data-gantt-row-id={`__genre:${row.genreKey}`}
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
