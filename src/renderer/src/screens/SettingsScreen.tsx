import { useState, useEffect, useRef } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useData } from '../context/DataContext'
import type { Genre } from '../types'

const DEFAULT_COLOR = '#6b7280'

const PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#6b7280',
  '#475569',
]

type AppSettings = {
  dataDir: string
  genres: Genre[]
  name: string
  mailAddress: string
  updateChannel: 'latest' | 'beta'
}

type SettingsTab = 'storage' | 'user' | 'categories' | 'update'

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
  genre,
  openPickerName,
  pickerRef,
  hexInput,
  deletingGenre,
  taskCount,
  onSwatchClick,
  onColorChange,
  onHexInput,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: SortableGenreItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: genre.name })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className="genre-item">
      <button className="genre-drag-handle" {...attributes} {...listeners} tabIndex={-1}>⠿</button>
      <div
        className="genre-color-swatch-wrapper"
        ref={openPickerName === genre.name ? pickerRef : undefined}
      >
        <button
          className="genre-color-swatch"
          style={{ backgroundColor: genre.color }}
          onClick={() => onSwatchClick(genre.name, genre.color)}
          title="色を変更"
        />
        {openPickerName === genre.name && (
          <div className="genre-color-picker">
            <div className="genre-color-palette">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  className={`genre-palette-swatch${genre.color === color ? ' genre-palette-swatch--active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onColorChange(genre.name, color)
                    onHexInput(genre.name, color.replace('#', ''))
                  }}
                  title={color}
                />
              ))}
            </div>
            <div className="genre-color-hex-row">
              <span className="genre-color-hex-prefix">#</span>
              <input
                type="text"
                className="genre-color-hex-input"
                maxLength={6}
                value={hexInput}
                onChange={(e) => onHexInput(genre.name, e.target.value)}
                placeholder="rrggbb"
              />
            </div>
          </div>
        )}
      </div>
      <span className="genre-item-name">{genre.name}</span>
      <span style={{ flex: 1 }} />
      {deletingGenre === genre.name ? (
        <span className="genre-delete-confirm">
          {taskCount > 0 && (
            <span>このジャンルを持つタスクが {taskCount} 件あります。</span>
          )}
          <button onClick={() => onDeleteConfirm(genre.name)}>削除</button>
          <button onClick={onDeleteCancel}>キャンセル</button>
        </span>
      ) : (
        <button onClick={() => onDeleteRequest(genre.name)}>🗑️</button>
      )}
    </li>
  )
}

type Props = {
  registerDirtyChecker: (fn: () => boolean) => void
}

export function SettingsScreen({ registerDirtyChecker }: Props): JSX.Element {
  const { tasksByProject, updateGenres } = useData()
  const [activeTab, setActiveTab] = useState<SettingsTab>('storage')

  // Storage tab state
  const [draftDataDir, setDraftDataDir] = useState('')
  const [savedDataDir, setSavedDataDir] = useState('')

  // User tab state
  const [draftName, setDraftName] = useState('')
  const [draftMail, setDraftMail] = useState('')
  const [savedName, setSavedName] = useState('')
  const [savedMail, setSavedMail] = useState('')

  // Update tab state
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

  // Categories tab state
  const [draftGenres, setDraftGenres] = useState<Genre[]>([])
  const [savedGenres, setSavedGenres] = useState<Genre[]>([])
  const [newGenre, setNewGenre] = useState('')
  const [deletingGenre, setDeletingGenre] = useState<string | null>(null)
  const [openPickerName, setOpenPickerName] = useState<string | null>(null)
  const [hexInput, setHexInput] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Dirty flags
  const storageIsDirty = draftDataDir !== savedDataDir
  const userIsDirty = draftName !== savedName || draftMail !== savedMail
  const categoriesIsDirty = JSON.stringify(draftGenres) !== JSON.stringify(savedGenres)
  const updateIsDirty = draftChannel !== savedChannel

  useEffect(() => {
    loadSettings()
    window.api.invoke('app:get-version').then((v) => setAppVersion(v as string))
    const handler = (...args: unknown[]): void => {
      setUpdateStatus(args[0] as typeof updateStatus)
    }
    window.api.on('updater:status', handler)
    return () => window.api.off('updater:status', handler)
  }, [])

  useEffect(() => {
    registerDirtyChecker(() => storageIsDirty || userIsDirty || categoriesIsDirty)
  }, [storageIsDirty, userIsDirty, categoriesIsDirty])

  useEffect(() => {
    if (!openPickerName) return
    const handler = (e: MouseEvent): void => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpenPickerName(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openPickerName])

  const loadSettings = async (): Promise<void> => {
    const settings = (await window.api.invoke('settings:get')) as AppSettings
    setSavedDataDir(settings.dataDir)
    setDraftDataDir(settings.dataDir)
    setSavedName(settings.name ?? '')
    setDraftName(settings.name ?? '')
    setSavedMail(settings.mailAddress ?? '')
    setDraftMail(settings.mailAddress ?? '')
    setSavedGenres(settings.genres ?? [])
    setDraftGenres(settings.genres ?? [])
    setSavedChannel(settings.updateChannel ?? 'latest')
    setDraftChannel(settings.updateChannel ?? 'latest')
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleTabChange = (next: SettingsTab): void => {
    const currentIsDirty =
      activeTab === 'storage' ? storageIsDirty :
      activeTab === 'user' ? userIsDirty :
      activeTab === 'update' ? updateIsDirty :
      categoriesIsDirty

    if (currentIsDirty) {
      const ok = window.confirm('このタブの変更が保存されていません。破棄して移動しますか？')
      if (!ok) return
      setDraftDataDir(savedDataDir)
      setDraftName(savedName)
      setDraftMail(savedMail)
      setDraftGenres(savedGenres)
      setDraftChannel(savedChannel)
    }
    setErrorMsg(null)
    setSuccessMsg(null)
    setActiveTab(next)
  }

  // Storage tab handlers
  const handleSelectFolder = async (): Promise<void> => {
    const selected = (await window.api.invoke('dialog:open-folder')) as string | null
    if (selected) setDraftDataDir(selected)
  }

  const handleStorageSave = async (): Promise<void> => {
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    const result = (await window.api.invoke('settings:set', { dataDir: draftDataDir })) as {
      ok: boolean
      error?: { code: string; message: string }
    }
    if (!result.ok) {
      setErrorMsg(result.error?.message ?? '保存に失敗しました')
      setDraftDataDir(savedDataDir)
    } else {
      setSavedDataDir(draftDataDir)
      setSuccessMsg('保存しました')
    }
    setSaving(false)
  }

  // User tab handlers
  const handleUserSave = async (): Promise<void> => {
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    await window.api.invoke('settings:user-info-set', { name: draftName, mailAddress: draftMail })
    setSavedName(draftName)
    setSavedMail(draftMail)
    setSuccessMsg('保存しました')
    setSaving(false)
  }

  // Update tab handlers
  const handleUpdateSave = async (): Promise<void> => {
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    await window.api.invoke('settings:update-channel-set', draftChannel)
    setSavedChannel(draftChannel)
    setSuccessMsg('保存しました')
    setSaving(false)
  }

  // Categories tab handlers
  const handleCategoriesSave = async (): Promise<void> => {
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    await window.api.invoke('settings:genres-set', draftGenres)
    setSavedGenres([...draftGenres])
    updateGenres([...draftGenres])
    setSuccessMsg('保存しました')
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
    setDraftDataDir(savedDataDir)
    setDraftName(savedName)
    setDraftMail(savedMail)
    setDraftGenres([...savedGenres])
    setDraftChannel(savedChannel)
    setErrorMsg(null)
    setSuccessMsg(null)
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
    if (openPickerName === name) {
      setOpenPickerName(null)
    } else {
      setOpenPickerName(name)
      setHexInput(currentColor.replace('#', ''))
    }
  }

  const handleHexInput = (name: string, value: string): void => {
    setHexInput(value)
    if (/^[0-9a-fA-F]{6}$/.test(value)) {
      handleColorChange(name, `#${value}`)
    }
  }

  const getTaskCountForGenre = (name: string): number => {
    return Object.values(tasksByProject)
      .flat()
      .filter((t) => t.genre === name).length
  }

  const currentIsDirty =
    activeTab === 'storage' ? storageIsDirty :
    activeTab === 'user' ? userIsDirty :
    activeTab === 'update' ? updateIsDirty :
    categoriesIsDirty

  const handleSave = (): void => {
    if (activeTab === 'storage') handleStorageSave()
    else if (activeTab === 'user') handleUserSave()
    else if (activeTab === 'update') handleUpdateSave()
    else handleCategoriesSave()
  }

  return (
    <div className="settings-screen">
      <h2>設定</h2>

      {/* Tab bar */}
      <div className="repo-tabs">
        <button
          className={`repo-tab ${activeTab === 'storage' ? 'repo-tab--active' : ''}`}
          onClick={() => handleTabChange('storage')}
        >
          データ保存先
        </button>
        <button
          className={`repo-tab ${activeTab === 'user' ? 'repo-tab--active' : ''}`}
          onClick={() => handleTabChange('user')}
        >
          ユーザー情報
        </button>
        <button
          className={`repo-tab ${activeTab === 'categories' ? 'repo-tab--active' : ''}`}
          onClick={() => handleTabChange('categories')}
        >
          カテゴリ管理
        </button>
        <button
          className={`repo-tab ${activeTab === 'update' ? 'repo-tab--active' : ''}`}
          onClick={() => handleTabChange('update')}
        >
          アップデート
        </button>
      </div>

      <div className="repo-tab-content">
        {/* Storage tab */}
        {activeTab === 'storage' && (
          <div className="settings-tab-body">
            <div className="settings-section">
              <div className="settings-path-row">
                <input
                  type="text"
                  value={draftDataDir}
                  onChange={(e) => setDraftDataDir(e.target.value)}
                  placeholder="保存先フォルダのパス"
                />
                <button onClick={handleSelectFolder}>フォルダを選択</button>
              </div>
            </div>
            <div className="settings-tab-footer">
              <button onClick={handleSave} disabled={saving || !currentIsDirty}>
                {saving ? '保存中...' : '保存'}
              </button>
              <button onClick={handleDiscard} disabled={!currentIsDirty}>
                破棄
              </button>
              {errorMsg && <span className="error-message">{errorMsg}</span>}
              {successMsg && <span className="success-message">{successMsg}</span>}
            </div>
          </div>
        )}

        {/* User tab */}
        {activeTab === 'user' && (
          <div className="settings-tab-body">
            <div className="settings-section">
              <div className="settings-field">
                <label>表示名</label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="表示名"
                />
              </div>
              <div className="settings-field">
                <label>メールアドレス</label>
                <input
                  type="email"
                  value={draftMail}
                  onChange={(e) => setDraftMail(e.target.value)}
                  placeholder="example@example.com"
                />
              </div>
            </div>
            <div className="settings-tab-footer">
              <button onClick={handleSave} disabled={saving || !currentIsDirty}>
                {saving ? '保存中...' : '保存'}
              </button>
              <button onClick={handleDiscard} disabled={!currentIsDirty}>
                破棄
              </button>
              {errorMsg && <span className="error-message">{errorMsg}</span>}
              {successMsg && <span className="success-message">{successMsg}</span>}
            </div>
          </div>
        )}

        {/* Categories tab */}
        {activeTab === 'categories' && (
          <div className="settings-tab-body">
            <div className="settings-section">
              <label>ジャンル管理</label>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleGenreDragEnd}>
                <SortableContext items={draftGenres.map((g) => g.name)} strategy={verticalListSortingStrategy}>
                  <ul className="genre-list">
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
                  </ul>
                </SortableContext>
              </DndContext>
              <div className="genre-add-row">
                <input
                  type="text"
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddGenre() }}
                  placeholder="ジャンル名"
                />
                <button onClick={handleAddGenre}>追加</button>
              </div>
            </div>

            <div className="settings-section settings-section--placeholder">
              <label>タグ管理</label>
              <p className="settings-placeholder-text">タグ管理は近日追加予定です</p>
            </div>

            <div className="settings-tab-footer">
              <button onClick={handleSave} disabled={saving || !currentIsDirty}>
                {saving ? '保存中...' : '保存'}
              </button>
              <button onClick={handleDiscard} disabled={!currentIsDirty}>
                破棄
              </button>
              {errorMsg && <span className="error-message">{errorMsg}</span>}
              {successMsg && <span className="success-message">{successMsg}</span>}
            </div>
          </div>
        )}
        {/* Update tab */}
        {activeTab === 'update' && (
          <div className="settings-tab-body">
            <div className="settings-section">
              <label>アップデートチャンネル</label>
              <div className="settings-radio-group">
                <label className="settings-radio-label">
                  <input
                    type="radio"
                    name="updateChannel"
                    value="latest"
                    checked={draftChannel === 'latest'}
                    onChange={() => setDraftChannel('latest')}
                  />
                  安定版（Stable）
                </label>
                <label className="settings-radio-label">
                  <input
                    type="radio"
                    name="updateChannel"
                    value="beta"
                    checked={draftChannel === 'beta'}
                    onChange={() => setDraftChannel('beta')}
                  />
                  テスター版（Beta）
                </label>
              </div>
              <p className="settings-hint">
                テスター版では最新のベータビルドを受け取れます。安定版より不安定な場合があります。
              </p>
            </div>

            <div className="settings-section">
              <label>アップデート確認</label>
              <p className="settings-hint">現在のバージョン: {appVersion || '—'}</p>
              <div className="settings-update-row">
                <button
                  onClick={() => window.api.invoke('updater:check')}
                  disabled={updateStatus.type === 'checking' || updateStatus.type === 'downloading'}
                >
                  今すぐ確認
                </button>
                {updateStatus.type === 'ready' && (
                  <button onClick={() => window.api.invoke('updater:install')}>
                    今すぐインストール（v{updateStatus.version}）
                  </button>
                )}
              </div>
              <p className="settings-hint">
                {updateStatus.type === 'idle' && ''}
                {updateStatus.type === 'checking' && '確認中...'}
                {updateStatus.type === 'up-to-date' && '最新版です'}
                {updateStatus.type === 'downloading' && `ダウンロード中... ${updateStatus.percent}%`}
                {updateStatus.type === 'ready' && `v${updateStatus.version} の準備ができました`}
                {updateStatus.type === 'error' && `エラー: ${updateStatus.message}`}
              </p>
            </div>

            <div className="settings-tab-footer">
              <button onClick={handleSave} disabled={saving || !currentIsDirty}>
                {saving ? '保存中...' : '保存'}
              </button>
              <button onClick={handleDiscard} disabled={!currentIsDirty}>
                破棄
              </button>
              {errorMsg && <span className="error-message">{errorMsg}</span>}
              {successMsg && <span className="success-message">{successMsg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
