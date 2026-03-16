## Context

Laurel は Electron アプリ（React + TypeScript）。現在の View 型は `home` / `project` / `settings` の3種で、`App.tsx` の `renderMain` が分岐する。タスクは `Task` 型（`id`, `projectId`, `parentId`, `title`, `status`, `genre`, `tags`, `createdAt`, `order`）で管理される。設定は `AppSettings`（`dataDir`, `genres`）として `settings.json` に保存されている。

## Goals / Non-Goals

**Goals:**
- ルートタスクの個別ページ（`TaskDetailScreen`）を実装する
- detail タブでルートタスク・サブタスクを一覧し、各フィールドをインライン編集できる
- conversation タブでツリー状のコメントを投稿・表示できる
- 設定に `name` / `mailAddress` を追加し、SettingsScreen で編集できる
- 会話欄に投稿者の表示名を表示し、クリックでメールアドレスを確認できる

**Non-Goals:**
- リアルタイム同期・複数ユーザー間の共有
- コメントの編集・削除
- ファイル添付・リアクション機能
- タスクの並び替え（DnD）を detail タブで行う

## Decisions

### 1. View 型の拡張

`Sidebar.tsx` の `View` 型に `{ type: 'task'; projectId: string; taskId: string }` を追加する。

```ts
export type View =
  | { type: 'home' }
  | { type: 'project'; projectId: string }
  | { type: 'task'; projectId: string; taskId: string }
  | { type: 'settings' }
```

`TaskDetailScreen` はルートタスク専用のため、`taskId` は必ずルートタスクの id を指す。

### 2. TaskDetailScreen のコンポーネント構成

```
src/renderer/src/
├── screens/
│   └── TaskDetailScreen.tsx      # 新規作成
└── components/
    ├── TaskDetailTab.tsx          # detail タブのコンテンツ
    └── ConversationTab.tsx        # conversation タブのコンテンツ
```

`TaskDetailScreen` は2タブ切り替えを管理し、各タブを子コンポーネントに委譲する。

**Props:**
```ts
type Props = {
  projectId: string
  taskId: string
  onNavigateBack: () => void  // ProjectScreen へ戻るコールバック
}
```

### 3. detail タブの仕様

- ルートタスクとその全サブタスクをツリー表示する
- 各タスクのステータス・タスク名・ジャンル・タグをインライン編集できる
- 編集はフィールドをクリックして入力モードへ遷移し、Enter または blur で保存する
- ジャンルは既存の `genres`（設定値）からドロップダウンで選択する
- タグはカンマ区切り入力またはバッジ形式で追加・削除できる

### 4. コメントのデータモデル

`types.ts` に追加する `Comment` 型:

```ts
export type Comment = {
  id: string           // ULID
  taskId: string       // 紐づくルートタスクの id
  parentId: string | null  // ツリー構造の親コメント id（null = ルートコメント）
  authorName: string   // 投稿時の設定 name をスナップショット
  authorEmail: string  // 投稿時の設定 mailAddress をスナップショット
  body: string
  createdAt: string    // ISO 8601
}
```

コメントはプロジェクトデータと同一ファイル（`<projectId>.json`）の `comments` 配列に保存する。

```json
{
  "tasks": [...],
  "comments": [...]
}
```

### 5. IPC API（会話関連）

`preload/index.ts` に追加するチャンネル:

| チャンネル | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `comments:list` | `{ projectId, taskId }` | `Comment[]` | タスクのコメント一覧取得 |
| `comments:add` | `{ projectId, comment: Omit<Comment, 'id' \| 'createdAt'> }` | `Comment` | コメント投稿 |

### 6. 設定への name / mailAddress 追加

`AppSettings` 型に追加:

```ts
export type AppSettings = {
  dataDir: string
  genres: string[]
  name: string        // 表示名（空文字可）
  mailAddress: string // メールアドレス（空文字可）
}
```

デフォルト値はどちらも空文字。既存の `settings.json` に存在しない場合は空文字として読み込む。

`SettingsScreen.tsx` にユーザー情報セクションを追加し、`name` / `mailAddress` を入力・保存できるようにする。

### 7. ProjectScreen からの遷移

`ProjectScreen.tsx` で各ルートタスクのタイトル部分（またはアイコン）をクリックすると `onNavigateToTask` コールバックを呼び出す。

```ts
// ProjectScreen Props に追加
onNavigateToTask: (projectId: string, taskId: string) => void
```

`App.tsx` でこのコールバックを受けて `setCurrentView({ type: 'task', projectId, taskId })` を呼ぶ。

### 8. conversation タブの表示

- ルートコメントを時系列順に表示し、各コメントへの返信をツリー状にインデントして表示する
- 投稿者の表示名を常時表示し、名前クリックでメールアドレスをトグル表示する
- 新規コメント投稿フォームをタブ下部に固定表示する
- 返信ボタンをコメントに付与し、クリックで返信フォームをインライン展開する

## Risks / Trade-offs

- [コメントの保存場所] タスクと同じプロジェクトファイルに保存するため、コメント数が増大するとファイルサイズが大きくなる。将来的に別ファイルへの分離を検討する
- [ルートタスク専用] サブタスクの個別ページは今回スコープ外。サブタスクの detail ページは別 change で検討する
- [メールアドレスのスナップショット] 設定変更後も過去コメントの authorEmail は変わらない。これは意図的な仕様（投稿時の情報を保持する）
