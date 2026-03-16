## Context

Laurel は Electron アプリ（React + TypeScript）。ビュー管理は `App.tsx` の `currentView` 変数と `View` 型（`home` / `project` / `settings`）で行う。データ永続化はメインプロセスの `src/main/storage/` 配下で実装し、レンダラーとは IPC 経由でやりとりする。プロジェクトデータは `<dataDir>/<project-id>.json`、設定は `<userData>/laurel/settings.json` に保存される。

mailtrack ファイルのスキーマ（実ファイルより確認）:

```typescript
interface MailtrackFile {
  meta: { id: string; internetMessageId: string; conversationId: string }
  datetime: { received: string }   // ISO 8601
  subject: string
  importance: string
  from: string
  to: string
  cc: string
  bcc: string
  replyTo: string
  body: string                     // HTML 形式
  flags: { hasAttachments: string }
}
```

ファイル名は `20260310095647742-4c1cd601-f6b.json` のような ULID ライク形式で一意。

## Goals / Non-Goals

**Goals:**
- mailtrack フォルダ内の未処理 JSON ファイルを検出してカード表示する
- カードをプロジェクトに割り当てるとタスクが作成され、処理済みになる
- カードを破棄すると処理済みになる（タスクは作成しない）
- mailtrack ファイル自体への変更・削除・コピーは一切行わない
- 処理状態は Laurel 独自ファイル（`<userData>/laurel/mailtrack-state.json`）で管理する

**Non-Goals:**
- メール本文の完全表示・HTML レンダリング（本文プレビューはテキスト化のみ）
- 複数カードの同時表示
- mailtrack フォルダのリアルタイムウォッチ（手動スキャン／画面遷移時に取得）
- メール返信・転送などのメール操作

## Decisions

### 1. 処理状態の管理: Laurel 独自 JSON ファイル

`<userData>/laurel/mailtrack-state.json` に処理済みファイル名の配列を保存する。

```json
{
  "version": 1,
  "processedFiles": ["20260310095647742-4c1cd601-f6b.json", ...]
}
```

**理由:**
- mailtrack ファイルへの操作禁止という制約を確実に守れる
- settings.json と同じ `<userData>/laurel/` に置くことで管理場所が統一される
- シンプルな配列で十分（assign/discard の区別は不要）

### 2. mailtrack フォルダ設定: AppSettings に追加

`AppSettings` に `mailtrackDir: string | null` を追加する。未設定（null）の場合は Forge Today 画面で設定を促すメッセージを表示する。設定は既存の `settings:set` IPC チャンネルに含めて保存する。

### 3. IPC チャンネル

| チャンネル | 方向 | 引数 | 戻り値 |
|---|---|---|---|
| `mailtrack:get-candidates` | renderer→main | なし | `MailtrackCandidate[]` |
| `mailtrack:assign` | renderer→main | `{ fileName, projectId }` | `{ ok: boolean; error?: string }` |
| `mailtrack:discard` | renderer→main | `{ fileName }` | `{ ok: boolean }` |

### 4. MailtrackCandidate 型

```typescript
type MailtrackCandidate = {
  fileName: string      // JSON ファイル名（処理時のキー）
  subject: string
  from: string
  receivedAt: string    // ISO 8601
  bodyText: string      // HTML タグ除去済み（先頭 500 文字）
}
```

### 5. Task.source フィールドの追加

```typescript
type TaskSource =
  | { type: 'mailtrack'; fileName: string; body: string }  // body は HTML タグ除去済み全文

type Task = {
  // ... 既存フィールド
  source: TaskSource | null   // mailtrack 由来でない場合は null
}
```

既存の ProjectFile（`version: 1`）と互換性を保つため、`source` が存在しない場合は `null` として扱う（読み込み時に補完）。

### 6. Forge Today 画面のレイアウト

- カード1枚を中央に大きく表示する
- カード内容: 件名（大）・送信者・受信日時・本文プレビュー（最大 200 文字）
- 操作: プロジェクト選択ドロップダウン＋「追加」ボタン / 「破棄」ボタン
- 候補なし時: 「受信メールはすべて処理済みです」メッセージ
- mailtrackDir 未設定時: 「設定画面で mailtrack フォルダを指定してください」＋設定画面へのリンク

### 7. mailtrack:assign でのタスク作成

- `title`: メール件名
- `projectId`: 選択されたプロジェクト
- `parentId`: null（ルートタスク）
- `status`: `'todo'`
- `genre`: null
- `tags`: []
- `source`: `{ type: 'mailtrack', fileName, body: <HTML タグ除去済み全文> }`
- `order`: 既存ルートタスクの末尾

タスク作成後、`projectStore.saveProject()` を呼び出してファイルに書き込む。

## Risks / Trade-offs

- [source フィールド追加] 既存 ProjectFile の後方互換性が必要。読み込み時に `source` 未定義なら `null` を補完する migration を projectStore に追加する。
- [HTML 除去] 正規表現ベースの簡易実装のため、複雑な HTML では不完全な場合がある。プレビュー用途なので許容する。
- [手動スキャン] Forge Today 画面を開くたびに `mailtrack:get-candidates` を呼び出す。ファイル数が多い場合は遅延が生じる可能性があるが、現時点では許容する。
