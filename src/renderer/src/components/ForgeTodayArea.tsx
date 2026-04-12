import { useDraggable, useDroppable } from '@dnd-kit/core'
import {
  Box, Group, Text, Title, Badge, ActionIcon, UnstyledButton, Tooltip, Stack, Anchor
} from '@mantine/core'
import {
  IconRefresh, IconChevronLeft, IconChevronRight,
  IconTrash, IconMail, IconAlertCircle, IconSettings, IconInbox
} from '@tabler/icons-react'
import type { MailData } from '../types'

export type ForgeMail = {
  id: string
  data: { mail: MailData }
}

// ── Mail card content (exported for DragOverlay in parent) ────────────────────

export function MailCardContent({ mail }: { mail: ForgeMail }): JSX.Element {
  if (!mail?.data?.mail) {
    return <Box p="sm"><Text size="xs" c="dimmed">メールデータなし</Text></Box>
  }
  const m = mail.data.mail
  const receivedDate = new Date(m.datetime.received).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
  return (
    <Box
      style={{
        background: 'var(--mantine-color-dark-6)',
        border: '1px solid var(--mantine-color-dark-3)',
        borderRadius: 8,
        padding: '14px',
        userSelect: 'none'
      }}
    >
      <Group gap="xs" mb={8} align="center">
        <IconMail size={14} stroke={1.5} color="var(--mantine-color-blue-4)" />
        {m.importance === 'high' && (
          <Badge size="xs" color="red" leftSection={<IconAlertCircle size={10} />}>重要</Badge>
        )}
      </Group>
      <Text size="sm" fw={600} mb={8} lineClamp={4} style={{ lineHeight: 1.5 }}>
        {m.subject}
      </Text>
      <Stack gap={3}>
        <Group gap={6}>
          <Text size="xs" c="dimmed" w={48}>差出人</Text>
          <Text size="xs" style={{ flex: 1 }} lineClamp={1}>{m.from}</Text>
        </Group>
        <Group gap={6}>
          <Text size="xs" c="dimmed" w={48}>受信日</Text>
          <Text size="xs">{receivedDate}</Text>
        </Group>
      </Stack>
    </Box>
  )
}

// ── Draggable mail card ───────────────────────────────────────────────────────

function DraggableMailCard({ mail, hint }: { mail: ForgeMail; hint: boolean }): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'forge-mail-card',
    data: { mailId: mail.id }
  })
  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.3 : 1, cursor: 'grab' }}
    >
      <MailCardContent mail={mail} />
      {hint && (
        <Text size="xs" c="dimmed" mt={8} ta="center">
          ← 左のプロジェクトへドラッグ　/　Ctrl+ドラッグで複数追加
        </Text>
      )}
    </Box>
  )
}

// ── Trash drop target ─────────────────────────────────────────────────────────

function DroppableTrashTarget({ isDragging }: { isDragging: boolean }): JSX.Element {
  const { isOver, setNodeRef } = useDroppable({ id: 'trash' })
  return (
    <Tooltip label="無視（処理済みにする）" position="bottom" withArrow openDelay={200}>
      <UnstyledButton
        ref={setNodeRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          padding: '8px',
          borderRadius: 8,
          border: `2px solid ${isOver ? 'var(--mantine-color-red-4)' : isDragging ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-dark-5)'}`,
          background: isOver ? 'var(--mantine-color-red-9)' : isDragging ? 'var(--mantine-color-dark-6)' : 'transparent',
          transition: 'all 0.1s ease',
          opacity: isDragging ? 1 : 0.4
        }}
      >
        <IconTrash size={14} stroke={1.5} color={isOver ? 'var(--mantine-color-red-3)' : 'var(--mantine-color-dark-3)'} />
        <Text size="xs" c={isOver ? 'red.3' : 'dimmed'}>無視</Text>
      </UnstyledButton>
    </Tooltip>
  )
}

// ── ForgeTodayArea (controlled panel) ────────────────────────────────────────

type Props = {
  mails: ForgeMail[]
  mailFolder: string
  loaded: boolean
  currentIndex: number
  isDraggingMail: boolean
  onPrev: () => void
  onNext: () => void
  onRefresh: () => void
  onNavigateToSettings?: () => void
}

export function ForgeTodayArea({
  mails, mailFolder, loaded, currentIndex, isDraggingMail,
  onPrev, onNext, onRefresh, onNavigateToSettings
}: Props): JSX.Element {
  const currentMail = mails[currentIndex] ?? null

  return (
    <Box
      style={{
        border: '1px solid var(--mantine-color-dark-4)',
        borderRadius: 10,
        padding: '14px',
        background: 'var(--mantine-color-dark-7)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
    >
      {/* Header */}
      <Group justify="space-between" align="center">
        <Group gap={6} align="center">
          <Title order={5} style={{ color: 'var(--mantine-color-blue-4)' }}>Forge Today</Title>
          {loaded && mails.length > 0 && (
            <Badge size="xs" variant="light">{mails.length} 件</Badge>
          )}
        </Group>
        <Group gap={4}>
          {mails.length > 1 && (
            <>
              <ActionIcon size="sm" variant="subtle" disabled={currentIndex === 0} onClick={onPrev}>
                <IconChevronLeft size={14} />
              </ActionIcon>
              <Text size="xs" c="dimmed">{currentIndex + 1}/{mails.length}</Text>
              <ActionIcon size="sm" variant="subtle" disabled={currentIndex >= mails.length - 1} onClick={onNext}>
                <IconChevronRight size={14} />
              </ActionIcon>
            </>
          )}
          <ActionIcon size="sm" variant="subtle" onClick={onRefresh} title="更新">
            <IconRefresh size={14} />
          </ActionIcon>
        </Group>
      </Group>

      {/* State: loading */}
      {!loaded && (
        <Text size="xs" c="dimmed">読み込み中...</Text>
      )}

      {/* State: no folder */}
      {loaded && !mailFolder && (
        <Group gap={6} align="flex-start">
          <IconSettings size={14} color="var(--mantine-color-dark-2)" style={{ flexShrink: 0, marginTop: 2 }} />
          <Text size="xs" c="dimmed">
            メールフォルダが設定されていません。
            {onNavigateToSettings ? (
              <> <Anchor size="xs" onClick={onNavigateToSettings} style={{ cursor: 'pointer' }}>設定 &gt; ForgeToday</Anchor> で設定してください。</>
            ) : (
              ' 設定画面の ForgeToday タブでフォルダを指定してください。'
            )}
          </Text>
        </Group>
      )}

      {/* State: no mails */}
      {loaded && mailFolder && mails.length === 0 && (
        <Group gap={6} align="center">
          <IconInbox size={14} color="var(--mantine-color-dark-2)" />
          <Text size="xs" c="dimmed">未処理のメールはありません</Text>
        </Group>
      )}

      {/* Mail card */}
      {loaded && mailFolder && currentMail && (
        <DraggableMailCard mail={currentMail} hint={!isDraggingMail} />
      )}

      {/* Trash drop target (always rendered when there are mails) */}
      {loaded && mailFolder && mails.length > 0 && (
        <DroppableTrashTarget isDragging={isDraggingMail} />
      )}
    </Box>
  )
}
