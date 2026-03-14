import chokidar from 'chokidar'
import * as path from 'path'

export type WatcherCallbacks = {
  onChanged: (filePath: string) => void
  onAdded: (filePath: string) => void
  onRemoved: (filePath: string) => void
}

let watcher: ReturnType<typeof chokidar.watch> | null = null

export function startWatcher(
  dataDir: string,
  selfWriting: Set<string>,
  callbacks: WatcherCallbacks
): void {
  stopWatcher()

  watcher = chokidar.watch(path.join(dataDir, '*.json'), {
    usePolling: true,
    interval: 1000,
    ignoreInitial: true
  })

  watcher.on('change', (filePath) => {
    if (selfWriting.has(filePath)) return
    callbacks.onChanged(filePath)
  })

  watcher.on('add', (filePath) => {
    if (selfWriting.has(filePath)) return
    callbacks.onAdded(filePath)
  })

  watcher.on('unlink', (filePath) => {
    callbacks.onRemoved(filePath)
  })
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
