import { useState, useEffect, useRef } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Tabs, Box, Stack, Group, Text, Title, TextInput, Button,
  UnstyledButton, ActionIcon, Radio
} from '@mantine/core'
import { useData } from '../context/DataContext'
import type { Genre } from '../types'

const DEFAULT_COLOR = '#6b7280'

const PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7',
  '#ec4899', '#f43f5e', '#6b7280', '#475569',
]

type AppSettings = {
  dataDir: string
  genres: Genre[]
  name: string
  mailAddress: string
  updateChannel: 'latest' | 'beta'
}

type SortableGenreItemProps = {
  genre: Genre
  openPickerName: string | null
  pickerRef: React.RefObject<HTMLDivElement>
  hexInput: string
  deletingGenre: string | null
  taskCount: number
  onSwatchClick: (name: string, color: string) => void
  onColorChange: (name: string, color: string) => void
  onHexInput: (name: string, value: string) => void
  onDeleteRequest: (name: string) => void
  onDeleteConfirm: (name: string) => void
  onDeleteCancel: () => void
}

function SortableGenreItem({
  genre, openPickerName, pickerRef, hexInput, deletingGenre, taskCount,
  onSwatchClick, onColorChange, onHexInput, onDeleteRequest, onDeleteConfirm, onDeleteCancel
}: SortableGenreItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: genre.name })
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <Group ref={setNodeRef} style={style} gap="xs" align="center" mb={4}>
      <UnstyledButton {...attributes} {...listeners} tabIndex={-1} style={{ cursor: 'grab', color: 'var(--mantine-color-dark-3)', fontSize: 14 }}>⠿</UnstyledButton>

      <div ref={openPickerName === genre.name ? pickerRef : undefined} style={{ position: 'relative' }}>
        <UnstyledButton
          style={{
            width: 20, height: 20, borderRadius: 4,
            backgroundColor: genre.color, border: '2px solid var(--mantine-color-dark-4)',
            flexShrink: 0
          }}
          onClick={() => onSwatchClick(genre.name, genre.color)}
          title="色を変更"
        />
        {openPickerName === genre.name && (
          <Box
            style={{
              position: 'absolute', zIndex: 100, top: 24, left: 0,
              background: 'var(--mantine-color-dark-6)',
              border: '1px solid var(--mantine-color-dark-4)',
              borderRadius: 8, padding: 8, width: 160
            }}
          >
            <Group gap={4} mb={6}>
              {PALETTE.map((color) => (
                <UnstyledButton
                  key={color}
                  style={{
                    width: 20, height: 20, borderRadius: 4, backgroundColor: color,
                    outline: genre.color === color ? '2px solid white' : 'none',
                    outlineOffset: 1
                  }}
                  onClick={() => { onColorChange(genre.name, color); onHexInput(genre.name, color.replace('#', '')) }}
                  title={color}
                />
              ))}
            </Group>
            <Group gap={4} align="center">
              <Text size="xs" c="dimmed">#</Text>
              <TextInput
                size="xs"
                maxLength={6}
                value={hexInput}
                onChange={(e) => onHexInput(genre.name, e.target.value)}
                placeholder="rrggbb"
                style={{ flex: 1 }}
              />
            </Group>
          </Box>
        )}
      </div>

      <Text size="sm" style={{ flex: 1 }}>{genre.name}</Text>

      {deletingGenre === genre.name ? (
        <Group gap={4}>
          {taskCount > 0 && <Text size="xs" c="dimmed">{taskCount}件のタスクに影響</Text>}
          <Button size="xs" color="red" onClick={() => onDeleteConfirm(genre.name)}>削除</Button>
          <Button size="xs" variant="default" onClick={onDeleteCancel}>キャンセル</Button>
        </Group>
      ) : (
        <ActionIcon variant="subtle" size="xs" color="red" onClick={() => onDeleteRequest(genre.name)}>🗑️</ActionIcon>
      )}
    </Group>
  )
}

type Props = {
  registerDirtyChecker: (fn: () => boolean) => void
}

export function SettingsScreen({ registerDirtyChecker }: Props): JSX.Element {
  const { tasksByProject, updateGenres } = useData()
  const [activeTab, setActiveTab] = useState<string>('storage')

  const [draftDataDir, setDraftDataDir] = useState('')
  const [savedDataDir, setSavedDataDir] = useState('')

  const [draftName, setDraftName] = useState('')
  const [draftMail, setDraftMail] = useState('')
  const [savedName, setSavedName] = useState('')
  const [savedMail, setSavedMail] = useState('')

  const [draftChannel, setDraftChannel] = useState<'latest' | 'beta'>('latest')
  const [savedChannel, setSavedChannel] = useState<'latest' | 'beta'>('latest')
  const [appVersion, setAppVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<
    | { type: 'idle' }
    | { type: 'checking' }
    | { type: 'up-to-date' }
    | { type: 'downloading'; percent: number }
    | { type: 'ready'; version: string }
    | { type: 'error'; message: string }
  >({ type: 'idle' })

  const [draftGenres, setDraftGenres] = useState<Genre[]>([])
  const [savedGenres, setSavedGenres] = useState<Genre[]>([])
  const [newGenre, setNewGenre] = useState('')
  const [deletingGenre, setDeletingGenre] = useState<string | null>(null)
  const [openPickerName, setOpenPickerName] = useState<string | null>(null)
  const [hexInput, setHexInput] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const storageIsDirty = draftDataDir !== savedDataDir
  const userIsDirty = draftName !== savedName || draftMail !== savedMail
  const categoriesIsDirty = JSON.stringify(draftGenres) !== JSON.stringify(savedGenres)
  const updateIsDirty = draftChannel !== savedChannel

  useEffect(() => {
    loadSettings()
    window.api.invoke('app:get-version').then((v) => setAppVersion(v as string))
    const handler = (...args: unknown[]): void => { setUpdateStatus(args[0] as typeof updateStatus) }
    window.api.on('updater:status', handler)
    return () => window.api.off('updater:status', handler)
  }, [])

  useEffect(() => {
    registerDirtyChecker(() => storageIsDirty || userIsDirty || categoriesIsDirty)
  }, [storageIsDirty, userIsDirty, categoriesIsDirty])

  useEffect(() => {
    if (!openPickerName) return
    const handler = (e: MouseEvent): void => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpenPickerName(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openPickerName])

  const loadSettings = async (): Promise<void> => {
    const settings = (await window.api.invoke('settings:get')) as AppSettings
    setSavedDataDir(settings.dataDir); setDraftDataDir(settings.dataDir)
    setSavedName(settings.name ?? ''); setDraftName(settings.name ?? '')
    setSavedMail(settings.mailAddress ?? ''); setDraftMail(settings.mailAddress ?? '')
    setSavedGenres(settings.genres ?? []); setDraftGenres(settings.genres ?? [])
    setSavedChannel(settings.updateChannel ?? 'latest'); setDraftChannel(settings.updateChannel ?? 'latest')
    setErrorMsg(null); setSuccessMsg(null)
  }

  const handleTabChange = (next: string | null): void => {
    if (!next) return
    const currentIsDirty =
      activeTab === 'storage' ? storageIsDirty :
      activeTab === 'user' ? userIsDirty :
      activeTab === 'update' ? updateIsDirty : categoriesIsDirty

    if (currentIsDirty) {
      const ok = window.confirm('このタブの変更が保存されていません。破棄して移動しますか？')
      if (!ok) return
      setDraftDataDir(savedDataDir); setDraftName(savedName)
      setDraftMail(savedMail); setDraftGenres(savedGenres); setDraftChannel(savedChannel)
    }
    setErrorMsg(null); setSuccessMsg(null)
    setActiveTab(next)
  }

  const handleSelectFolder = async (): Promise<void> => {
    const selected = (await window.api.invoke('dialog:open-folder')) as string | null
    if (selected) setDraftDataDir(selected)
  }

  const handleStorageSave = async (): Promise<void> => {
    setSaving(true); setErrorMsg(null); setSuccessMsg(null)
    const result = (await window.api.invoke('settings:set', { dataDir: draftDataDir })) as { ok: boolean; error?: { message: string } }
    if (!result.ok) { setErrorMsg(result.error?.message ?? '保存に失敗しました'); setDraftDataDir(savedDataDir) }
    else { setSavedDataDir(draftDataDir); setSuccessMsg('保存しました') }
    setSaving(false)
  }

  const handleUserSave = async (): Promise<void> => {
    setSaving(true); setErrorMsg(null); setSuccessMsg(null)
    await window.api.invoke('settings:user-info-set', { name: draftName, mailAddress: draftMail })
    setSavedName(draftName); setSavedMail(draftMail); setSuccessMsg('保存しました')
    setSaving(false)
  }

  const handleUpdateSave = async (): Promise<void> => {
    setSaving(true); setErrorMsg(null); setSuccessMsg(null)
    await window.api.invoke('settings:update-channel-set', draftChannel)
    setSavedChannel(draftChannel); setSuccessMsg('保存しました')
    setSaving(false)
  }

  const handleCategoriesSave = async (): Promise<void> => {
    setSaving(true); setErrorMsg(null); setSuccessMsg(null)
    await window.api.invoke('settings:genres-set', draftGenres)
    setSavedGenres([...draftGenres]); updateGenres([...draftGenres]); setSuccessMsg('保存しました')
    setSaving(false)
  }

  const handleGenreDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = draftGenres.findIndex((g) => g.name === active.id)
    const newIndex = draftGenres.findIndex((g) => g.name === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    setDraftGenres(arrayMove(draftGenres, oldIndex, newIndex))
  }

  const handleDiscard = (): void => {
    setDraftDataDir(savedDataDir); setDraftName(savedName)
    setDraftMail(savedMail); setDraftGenres([...savedGenres]); setDraftChannel(savedChannel)
    setErrorMsg(null); setSuccessMsg(null)
  }

  const handleAddGenre = (): void => {
    const name = newGenre.trim()
    if (!name || draftGenres.some((g) => g.name === name)) return
    setNewGenre('')
    setDraftGenres([...draftGenres, { name, color: DEFAULT_COLOR }])
  }

  const handleDeleteGenre = (name: string): void => {
    setDeletingGenre(null)
    setDraftGenres(draftGenres.filter((g) => g.name !== name))
  }

  const handleColorChange = (name: string, color: string): void => {
    setDraftGenres(draftGenres.map((g) => (g.name === name ? { ...g, color } : g)))
  }

  const handleSwatchClick = (name: string, currentColor: string): void => {
    if (openPickerName === name) { setOpenPickerName(null) }
    else { setOpenPickerName(name); setHexInput(currentColor.replace('#', '')) }
  }

  const handleHexInput = (name: string, value: string): void => {
    setHexInput(value)
    if (/^[0-9a-fA-F]{6}$/.test(value)) handleColorChange(name, `#${value}`)
  }

  const getTaskCountForGenre = (name: string): number =>
    Object.values(tasksByProject).flat().filter((t) => t.genre === name).length

  const currentIsDirty =
    activeTab === 'storage' ? storageIsDirty :
    activeTab === 'user' ? userIsDirty :
    activeTab === 'update' ? updateIsDirty : categoriesIsDirty

  const handleSave = (): void => {
    if (activeTab === 'storage') handleStorageSave()
    else if (activeTab === 'user') handleUserSave()
    else if (activeTab === 'update') handleUpdateSave()
    else handleCategoriesSave()
  }

  const Footer = (): JSX.Element => (
    <Group gap="xs" mt="md">
      <Button size="xs" onClick={handleSave} disabled={saving || !currentIsDirty}>
        {saving ? '保存中...' : '保存'}
      </Button>
      <Button size="xs" variant="default" onClick={handleDiscard} disabled={!currentIsDirty}>破棄</Button>
      {errorMsg && <Text size="xs" c="red">{errorMsg}</Text>}
      {successMsg && <Text size="xs" c="green">{successMsg}</Text>}
    </Group>
  )

  return (
    <Box p="md" style={{ maxWidth: 600 }}>
      <Title order={4} mb="md">設定</Title>

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List mb="md">
          <Tabs.Tab value="storage">データ保存先</Tabs.Tab>
          <Tabs.Tab value="user">ユーザー情報</Tabs.Tab>
          <Tabs.Tab value="categories">カテゴリ管理</Tabs.Tab>
          <Tabs.Tab value="update">アップデート</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="storage">
          <Stack gap="sm">
            <Group gap="xs">
              <TextInput
                value={draftDataDir}
                onChange={(e) => setDraftDataDir(e.target.value)}
                placeholder="保存先フォルダのパス"
                size="xs"
                style={{ flex: 1 }}
              />
              <Button size="xs" variant="default" onClick={handleSelectFolder}>フォルダを選択</Button>
            </Group>
            <Footer />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="user">
          <Stack gap="sm">
            <TextInput label="表示名" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="表示名" size="xs" />
            <TextInput label="メールアドレス" type="email" value={draftMail} onChange={(e) => setDraftMail(e.target.value)} placeholder="example@example.com" size="xs" />
            <Footer />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="categories">
          <Stack gap="sm">
            <Text size="xs" fw={600}>ジャンル管理</Text>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleGenreDragEnd}>
              <SortableContext items={draftGenres.map((g) => g.name)} strategy={verticalListSortingStrategy}>
                <Stack gap={0}>
                  {draftGenres.map((genre) => (
                    <SortableGenreItem
                      key={genre.name}
                      genre={genre}
                      openPickerName={openPickerName}
                      pickerRef={pickerRef}
                      hexInput={hexInput}
                      deletingGenre={deletingGenre}
                      taskCount={getTaskCountForGenre(genre.name)}
                      onSwatchClick={handleSwatchClick}
                      onColorChange={handleColorChange}
                      onHexInput={handleHexInput}
                      onDeleteRequest={(name) => setDeletingGenre(name)}
                      onDeleteConfirm={handleDeleteGenre}
                      onDeleteCancel={() => setDeletingGenre(null)}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
            <Group gap="xs">
              <TextInput
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddGenre() }}
                placeholder="ジャンル名"
                size="xs"
                style={{ flex: 1 }}
              />
              <Button size="xs" onClick={handleAddGenre}>追加</Button>
            </Group>

            <Box mt="sm">
              <Text size="xs" fw={600} mb={4}>タグ管理</Text>
              <Text size="xs" c="dimmed">タグ管理は近日追加予定です</Text>
            </Box>
            <Footer />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="update">
          <Stack gap="sm">
            <Box>
              <Text size="xs" fw={600} mb="xs">アップデートチャンネル</Text>
              <Radio.Group value={draftChannel} onChange={(v) => setDraftChannel(v as 'latest' | 'beta')}>
                <Stack gap="xs">
                  <Radio value="latest" label="安定版（Stable）" size="xs" />
                  <Radio value="beta" label="テスター版（Beta）" size="xs" />
                </Stack>
              </Radio.Group>
              <Text size="xs" c="dimmed" mt="xs">テスター版では最新のベータビルドを受け取れます。安定版より不安定な場合があります。</Text>
            </Box>

            <Box>
              <Text size="xs" fw={600} mb="xs">アップデート確認</Text>
              <Text size="xs" c="dimmed" mb="xs">現在のバージョン: {appVersion || '—'}</Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="default"
                  onClick={() => window.api.invoke('updater:check')}
                  disabled={updateStatus.type === 'checking' || updateStatus.type === 'downloading'}
                >
                  今すぐ確認
                </Button>
                {updateStatus.type === 'ready' && (
                  <Button size="xs" onClick={() => window.api.invoke('updater:install')}>
                    インストール（v{updateStatus.version}）
                  </Button>
                )}
              </Group>
              {updateStatus.type !== 'idle' && (
                <Text size="xs" c="dimmed" mt="xs">
                  {updateStatus.type === 'checking' && '確認中...'}
                  {updateStatus.type === 'up-to-date' && '最新版です'}
                  {updateStatus.type === 'downloading' && `ダウンロード中... ${updateStatus.percent}%`}
                  {updateStatus.type === 'ready' && `v${updateStatus.version} の準備ができました`}
                  {updateStatus.type === 'error' && `エラー: ${updateStatus.message}`}
                </Text>
              )}
            </Box>
            <Footer />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Box>
  )
}
