# Laurel

A local-first task management app built with Electron.

[日本語版はこちら](README.ja.md)

## Overview

Laurel is a desktop task management application designed to run entirely on your local machine. No accounts, no cloud sync, no internet connection required — all your data stays on your computer.

## Features

- **Projects** — Organize tasks by project
- **Tasks & Subtasks** — Create hierarchical task structures with drag-and-drop reordering
- **Issues & Comments** — Attach issues and comment threads to tasks (GitHub-style)
- **Genre System** — Categorize tasks with genres; filter and toggle visibility
- **Tag Filtering** — Add tags to tasks and filter by them
- **Local Storage** — All data saved as JSON files in a folder of your choice
- **Auto Updater** — In-app updates via GitHub Releases (stable / beta channels)

## Download

Download the latest installer from the [Releases](https://github.com/3rdJCG/laurel/releases) page.

> **Note:** On first launch, Windows SmartScreen may show a warning because the app is not code-signed. Click "More info" → "Run anyway" to proceed.

## Development

### Requirements

- Node.js 20+
- npm 10+

### Setup

```bash
git clone https://github.com/3rdJCG/laurel.git
cd laurel
npm install
npm run dev
```

### Commands

```bash
npm run dev          # Start development server
npm run build        # Production build (with typecheck)
npm run typecheck    # TypeScript type check only
npm run build:win    # Windows installer (.exe)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage)
```

## Privacy

Laurel collects no personal information and makes no internet connections. All data is stored locally as JSON files. See [docs/PRIVACY.md](docs/PRIVACY.md) for details.

## Tech Stack

- [Electron](https://www.electronjs.org/) 41
- [React](https://react.dev/) 18 + [TypeScript](https://www.typescriptlang.org/) 5
- [electron-vite](https://electron-vite.org/) 3
- [electron-updater](https://www.electron.build/auto-update) — auto updates
- [@dnd-kit](https://dndkit.com/) — drag and drop
- [chokidar](https://github.com/paulmillr/chokidar) — file watching

## License

MIT
