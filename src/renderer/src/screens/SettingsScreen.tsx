import { useState, useEffect } from 'react'
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
}

export function SettingsScreen(): JSX.Element {
  const { tasksByProject } = useData()
  const [dataDir, setDataDir] = useState('')
  const [genres, setGenres] = useState<Genre[]>([])
  const [newGenre, setNewGenre] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingGenre, setDeletingGenre] = useState<string | null>(null)
  const [openPickerName, setOpenPickerName] = useState<string | null>(null)
  const [hexInput, setHexInput] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    const settings = (await window.api.invoke('settings:get')) as AppSettings
    setDataDir(settings.dataDir)
    setGenres(settings.genres ?? [])
    setErrorMsg(null)
  }

  const handleSelectFolder = async (): Promise<void> => {
    const selected = (await window.api.invoke('dialog:open-folder')) as string | null
    if (selected) setDataDir(selected)
  }

  const saveDataDir = async (newDataDir: string): Promise<boolean> => {
    const result = (await window.api.invoke('settings:set', { dataDir: newDataDir })) as {
      ok: boolean
      error?: { code: string; message: string }
    }
    if (!result.ok) {
      setErrorMsg(result.error?.message ?? '保存に失敗しました')
      await loadSettings()
      return false
    }
    return true
  }

  const saveGenres = async (updated: Genre[]): Promise<void> => {
    setGenres(updated)
    await window.api.invoke('settings:genres-set', updated)
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    const ok = await saveDataDir(dataDir)
    setSaving(false)
    if (ok) setSuccessMsg('設定を保存しました')
  }

  const handleAddGenre = async (): Promise<void> => {
    const name = newGenre.trim()
    if (!name || genres.some((g) => g.name === name)) return
    setNewGenre('')
    await saveGenres([...genres, { name, color: DEFAULT_COLOR }])
  }

  const handleDeleteGenre = async (name: string): Promise<void> => {
    setDeletingGenre(null)
    await saveGenres(genres.filter((g) => g.name !== name))
  }

  const handleColorChange = async (name: string, color: string): Promise<void> => {
    await saveGenres(genres.map((g) => (g.name === name ? { ...g, color } : g)))
  }

  const handleSwatchClick = (name: string, currentColor: string): void => {
    if (openPickerName === name) {
      setOpenPickerName(null)
    } else {
      setOpenPickerName(name)
      setHexInput(currentColor.replace('#', ''))
    }
  }

  const handleHexInput = async (name: string, value: string): Promise<void> => {
    setHexInput(value)
    if (/^[0-9a-fA-F]{6}$/.test(value)) {
      await handleColorChange(name, `#${value}`)
    }
  }

  const getTaskCountForGenre = (name: string): number => {
    return Object.values(tasksByProject)
      .flat()
      .filter((t) => t.genre === name).length
  }

  return (
    <div className="settings-screen">
      <h2>設定</h2>

      <div className="settings-section">
        <label>データ保存先</label>
        <div className="settings-path-row">
          <input
            type="text"
            value={dataDir}
            onChange={(e) => setDataDir(e.target.value)}
            placeholder="保存先フォルダのパス"
          />
          <button onClick={handleSelectFolder}>フォルダを選択</button>
        </div>
        {errorMsg && <p className="error-message">{errorMsg}</p>}
      </div>

      <div className="settings-section">
        <label>ジャンル管理</label>
        <ul className="genre-list">
          {genres.map((genre) => (
            <li key={genre.name} className="genre-item">
              <button
                className="genre-color-swatch"
                style={{ backgroundColor: genre.color }}
                onClick={() => handleSwatchClick(genre.name, genre.color)}
                title="色を変更"
              />
              <span className="genre-item-name">{genre.name}</span>
              {openPickerName === genre.name && (
                <div className="genre-color-picker">
                  <div className="genre-color-palette">
                    {PALETTE.map((color) => (
                      <button
                        key={color}
                        className={`genre-palette-swatch${genre.color === color ? ' genre-palette-swatch--active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          handleColorChange(genre.name, color)
                          setHexInput(color.replace('#', ''))
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
                      onChange={(e) => handleHexInput(genre.name, e.target.value)}
                      placeholder="rrggbb"
                    />
                  </div>
                </div>
              )}
              <span style={{ flex: 1 }} />
              {deletingGenre === genre.name ? (
                <span className="genre-delete-confirm">
                  {getTaskCountForGenre(genre.name) > 0 && (
                    <span>このジャンルを持つタスクが {getTaskCountForGenre(genre.name)} 件あります。</span>
                  )}
                  <button onClick={() => handleDeleteGenre(genre.name)}>削除</button>
                  <button onClick={() => setDeletingGenre(null)}>キャンセル</button>
                </span>
              ) : (
                <button onClick={() => setDeletingGenre(genre.name)}>🗑️</button>
              )}
            </li>
          ))}
        </ul>
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

      <div className="settings-footer">
        <button onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '変更を保存'}
        </button>
        {successMsg && <p className="success-message">{successMsg}</p>}
      </div>
    </div>
  )
}
