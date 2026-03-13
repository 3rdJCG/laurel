## Context

Laurel は Electron アプリ。現在データは `useState` のインメモリ管理のみ。メインプロセス（Node.js）はファイルシステムに直接アクセスできるが、レンダラー（React）は contextBridge 経由の IPC でしかメインプロセスと通信できない。ネットワーク共有（Samba/UNC）への対応が要件に含まれるため、ファイル監視の信頼性が設計の核心となる。

## Goals / Non-Goals

**Goals:**
- Project ごとに独立した JSON ファイルでデータを管理する
- デフォルト保存先（Documents/laurel）とカスタムパス（UNC パス含む）の両対応
- 保存先ディレクトリを監視し、外部からのファイル変更・追加・削除をアプリに即時反映する
- 設定ファイルを常に userData に保存する

**Non-Goals:**
- クラウドストレージ・DB・同期サービスとの連携
- 競合解決（複数クライアントが同時に書き込んだ場合のマージ）
- 暗号化・アクセス制御

## Decisions

### 1. ファイル構造

```
# 設定（常に userData に配置）
<userData>/
  laurel/
    settings.json          # 保存先パスなどのアプリ設定

# データ・デフォルト（Documents/laurel/）
<Documents>/
  laurel/
    <project-ulid>.json    # Project 1件 + その Task 一覧
    <project-ulid>.json    # Project 2件目

# データ・カスタム指定時（指定フォルダに直接配置）
<指定フォルダ>/
  <project-ulid>.json      # laurel/ サブディレクトリは作らない
  <project-ulid>.json
```

各プロジェクトファイルの構造:
```json
{
  "version": 1,
  "project": { "id": "01ARZ...", "name": "My Project", "createdAt": "2026-03-13T..." },
  "tasks": [
    { "id": "01BRZ...", "projectId": "01ARZ...", "parentId": null, "title": "...", "status": "todo", ... }
  ]
}
```

**理由:**
- Project ごとにファイルを分けることで、1プロジェクトの変更が他プロジェクトのファイルに影響しない
- 外部変更検知時にどのプロジェクトが更新されたか特定しやすい
- ファイル名を ULID にすることで辞書順 = 時系列順ソートが可能
- デフォルトは Documents/laurel/ でユーザーが見つけやすい。カスタム指定時はユーザーが選んだフォルダに直接置く

**設定ファイルのデフォルト保存先:** `<userData>/laurel/settings.json`
`userData` は Electron の `app.getPath('userData')` で取得。

### 2. ファイル監視: chokidar（ポーリングモード）でディレクトリを監視

プロジェクトファイルが複数あるため、個別ファイルではなく保存先ディレクトリ全体を監視する。

```ts
import chokidar from 'chokidar'

const watcher = chokidar.watch(path.join(dataDir, '*.json'), {
  usePolling: true,    // ネットワーク共有で fs.watch() が使えない場合に対応
  interval: 1000,      // ポーリング間隔（ms）
  ignoreInitial: true,
})

watcher.on('add',    (filePath) => reloadProject(filePath))   // 別クライアントがプロジェクト追加
watcher.on('change', (filePath) => reloadProject(filePath))   // プロジェクトデータ更新
watcher.on('unlink', (filePath) => removeProject(filePath))   // プロジェクト削除
```

**なぜポーリングが必要か:** Node.js の `fs.watch()` は inotify/FSEvents に依存しており、Samba/NFS などのネットワーク共有では変更通知が届かないことが多い。`chokidar` のポーリングモードはファイルの mtime を定期確認するためネットワーク共有でも確実に動作する。

**代替案:** `fs.watch()` のみ → ローカルでは動くがネットワーク共有で不安定なため不採用。

### 3. 自己書き込みによる二重反映の防止

アプリ自身がファイルを書き込んだ直後にも `change` イベントが発火する。ファイルパスごとにフラグを管理して防ぐ。

```ts
const selfWriting = new Set<string>()

async function saveProject(filePath: string, data: ProjectFile) {
  selfWriting.add(filePath)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  setTimeout(() => selfWriting.delete(filePath), 1500) // ポーリング間隔より長く設定
}

watcher.on('change', (filePath) => {
  if (selfWriting.has(filePath)) return  // 自己書き込みは無視
  reloadProject(filePath)
})
```

### 4. IPC 設計

```
レンダラー → メインプロセス（invoke）:
  'data:load-all'         → 全プロジェクト・タスクを返す
  'data:save-project'     → 1プロジェクト分のデータを受け取り保存
  'data:delete-project'   → プロジェクトファイルを削除
  'settings:get'          → 設定を返す
  'settings:set'          → 設定を保存（保存先変更時はウォッチャーを再起動）

メインプロセス → レンダラー（send）:
  'data:project-changed'  → プロジェクトファイル変更時、更新データを渡して通知
  'data:project-removed'  → プロジェクトファイル削除時、projectId を渡して通知
  'data:project-added'    → 新プロジェクトファイル追加時、データを渡して通知
```

### 5. 保存先変更時の挙動

1. 旧ウォッチャーを停止
2. 新パスが存在しなければ作成
3. 新パスに既存 JSON ファイルがあれば読み込む。なければ現在の全プロジェクトファイルを新パスにコピー
4. 新パスでウォッチャーを開始
5. `settings.json` に新パスを保存
6. レンダラーにデータ再読み込みを通知

### 6. 状態変更操作後の永続化ルール（横断ルール）

レンダラー側でプロジェクト・タスクのデータを変更する**すべての操作**は、UIの状態更新と同時に対応する IPC を呼び出してファイルに永続化しなければならない。

```
操作の種類                          呼び出す IPC
──────────────────────────────────────────────────────────
プロジェクト作成                   data:save-project
プロジェクト名変更                 data:save-project
プロジェクト削除                   data:delete-project
タスク作成（ルート・サブタスク）    data:save-project
タスクタイトル編集                 data:save-project
タスクステータス変更               data:save-project
タスク genre / tags 変更          data:save-project
タスク削除（子孫連鎖削除含む）     data:save-project
タスク並び替え                    data:save-project
```

**原則:** 「UIを更新した = ファイルも更新した」でなければならない。IPC 呼び出しを省略した場合、アプリ再起動時に変更が失われる。

**実装パターン:**
```ts
// 例: タスクステータス変更
async function changeTaskStatus(projectId: string, taskId: string, newStatus: TaskStatus) {
  // 1. インメモリ状態を更新
  const updated = updateTaskInState(projectId, taskId, { status: newStatus })
  // 2. 即座にファイルへ永続化
  await window.api.invoke('data:save-project', { projectId, project: updated.project, tasks: updated.tasks })
}
```

**エラー時の挙動:** `data:save-project` / `data:delete-project` が失敗した場合は `error-handling-ui` の `storage-error-notification` spec に従いエラーを通知する。UIの状態はロールバックしない（Last Write Wins 方針）。

## Risks / Trade-offs

- [ポーリングによる最大1秒のタイムラグ] → 実用上問題なし。必要なら `interval` を短縮できる
- [UNC パスへのアクセス権限がない場合] → 書き込み前にアクセス確認を行い、失敗時はエラーをレンダラーに通知してデフォルトパスへフォールバック
- [複数クライアントが同時に書き込んだ場合の競合] → このスコープでは Last Write Wins とする。競合解決は将来の Change で検討
- [カスタム指定フォルダに他のファイルが混在する可能性] → `*.json` のみを監視対象にすることでノイズを最小化。ただし同フォルダに別アプリの JSON が存在するケースは非サポート

## Migration Plan

1. `chokidar` を依存追加（`npm install chokidar`）
2. `src/main/storage/` に storage モジュールを実装（ファイル読み書き・ウォッチャー管理）
3. `src/preload/index.ts` に IPC ブリッジを追加
4. レンダラーのデータ管理を IPC 経由に切り替え
5. 動作確認: ローカル保存 → 別エディタでファイル編集 → アプリへの反映を確認
6. ロールバック: IPC ハンドラーを削除し `useState` に戻すことで即時復旧可能