import { app, BrowserWindow, screen } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

type WindowState = { width: number; height: number; x?: number; y?: number }

const DEFAULT: WindowState = { width: 900, height: 670 }
const statePath = path.join(app.getPath('userData'), 'window-state.json')

export function loadWindowState(): WindowState {
  try {
    if (fs.existsSync(statePath)) {
      const raw = fs.readFileSync(statePath, 'utf-8')
      const saved = JSON.parse(raw) as WindowState
      const { width, height, x, y } = saved
      if (typeof width !== 'number' || typeof height !== 'number') return DEFAULT

      // Validate position is within display bounds
      if (typeof x === 'number' && typeof y === 'number') {
        const displays = screen.getAllDisplays()
        const visible = displays.some((d) => {
          const { bounds } = d
          return (
            x >= bounds.x &&
            y >= bounds.y &&
            x + width <= bounds.x + bounds.width &&
            y + height <= bounds.y + bounds.height
          )
        })
        if (visible) return { width, height, x, y }
      }

      return { width, height }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT
}

export function saveWindowState(win: BrowserWindow): void {
  try {
    const bounds = win.getBounds()
    const state: WindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y
    }
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
  } catch {
    // non-fatal
  }
}
