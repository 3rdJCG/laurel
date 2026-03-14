import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'

type AppSettings = {
  dataDir: string
  genres: string[]
}

export function SettingsScreen(): JSX.Element {
  const { tasksByProject } = useData()
  const [dataDir, setDataDir] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [newGenre, setNewGenre] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingGenre, setDeletingGenre] = useState<string | null>(null)

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

  const saveSettingsNow = async (newSettings: Partial<AppSettings>): Promise<boolean> => {
    const current = { dataDir, genres }
    const merged = { ...current, ...newSettings }
    const result = (await window.api.invoke('settings:set', merged)) as {
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

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    const ok = await saveSettingsNow({ dataDir, genres })
    setSaving(false)
    if (ok) setSuccessMsg('設定を保存しました')
  }

  const handleAddGenre = async (): Promise<void> => {
    const name = newGenre.trim()
    if (!name || genres.includes(name)) return
    const updated = [...genres, name]
    setGenres(updated)
    setNewGenre('')
    await saveSettingsNow({ genres: updated })
  }

  const handleDeleteGenre = async (genre: string): Promise<void> => {
    const updated = genres.filter((g) => g !== genre)
    setGenres(updated)
    setDeletingGenre(null)
    await saveSettingsNow({ genres: updated })
  }

  const getTaskCountForGenre = (genre: string): number => {
    return Object.values(tasksByProject)
      .flat()
      .filter((t) => t.genre === genre).length
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
            <li key={genre} className="genre-item">
              <span>{genre}</span>
              {deletingGenre === genre ? (
                <span className="genre-delete-confirm">
                  {getTaskCountForGenre(genre) > 0 && (
                    <span>このジャンルを持つタスクが {getTaskCountForGenre(genre)} 件あります。</span>
                  )}
                  <button onClick={() => handleDeleteGenre(genre)}>削除</button>
                  <button onClick={() => setDeletingGenre(null)}>キャンセル</button>
                </span>
              ) : (
                <button onClick={() => setDeletingGenre(genre)}>🗑️</button>
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
