import { useState, useRef, useEffect } from 'react'
import type { Genre } from '../types'

type Props = {
  value: string | null
  genres: Genre[]
  onChange: (value: string | null) => void
  onAddGenre: (name: string) => Promise<void>
}

export function GenrePicker({ value, genres, onChange, onAddGenre }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  // Build display list: registered genres + any unregistered value from existing task
  const displayGenres: Genre[] = [...genres]
  if (value && !genres.some((g) => g.name === value)) {
    displayGenres.push({ name: value, color: '#6b7280' })
  }

  const selectedGenre = displayGenres.find((g) => g.name === value) ?? null

  const close = (): void => {
    setOpen(false)
    setShowAddForm(false)
    setNewName('')
  }

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  useEffect(() => {
    if (showAddForm) addInputRef.current?.focus()
  }, [showAddForm])

  const handleSelect = (name: string | null): void => {
    onChange(name)
    setOpen(false)
    setShowAddForm(false)
    setNewName('')
  }

  const handleAddSubmit = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    await onAddGenre(name)
    onChange(name)
    setOpen(false)
    setShowAddForm(false)
    setNewName('')
  }

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddSubmit() }
    // Escape is handled by global keydown listener
  }

  return (
    <div className="genre-picker" ref={containerRef}>
      <button
        type="button"
        className="genre-picker-trigger"
        onClick={() => { setOpen((v) => !v); setShowAddForm(false) }}
      >
        {selectedGenre ? (
          <>
            <span className="genre-picker-swatch" style={{ backgroundColor: selectedGenre.color }} />
            <span>{selectedGenre.name}</span>
          </>
        ) : (
          <span className="genre-picker-placeholder">ジャンルなし</span>
        )}
        <span className="genre-picker-arrow">▾</span>
      </button>

      {open && (
        <div className="genre-picker-dropdown">
          <button
            type="button"
            className={`genre-picker-option${value === null ? ' genre-picker-option--selected' : ''}`}
            onClick={() => handleSelect(null)}
          >
            <span className="genre-picker-option-name">ジャンルなし</span>
          </button>

          {displayGenres.map((g) => (
            <button
              key={g.name}
              type="button"
              className={`genre-picker-option${value === g.name ? ' genre-picker-option--selected' : ''}`}
              onClick={() => handleSelect(g.name)}
            >
              <span className="genre-picker-swatch" style={{ backgroundColor: g.color }} />
              <span className="genre-picker-option-name">{g.name}</span>
            </button>
          ))}

          <div className="genre-picker-divider" />

          {showAddForm ? (
            <div className="genre-picker-add-form">
              <input
                ref={addInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="ジャンル名"
              />
              <button type="button" onClick={handleAddSubmit}>追加</button>
              <button type="button" onClick={() => { setShowAddForm(false); setNewName('') }}>✕</button>
            </div>
          ) : (
            <button
              type="button"
              className="genre-picker-add-btn"
              onClick={() => setShowAddForm(true)}
            >
              + 新しいジャンルを追加
            </button>
          )}
        </div>
      )}
    </div>
  )
}
