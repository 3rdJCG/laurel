## Context

Laurel は Electron アプリ（React + TypeScript）。タスク管理の主画面は `ProjectScreen.tsx` で、タスク行の描画は `TaskItem.tsx` が担当。ジャンル色は `Genre.color`（hex 文字列）として `DataContext` の `genres` ステートに保持されている。`Task.genre` はジャンル名（`Genre.name`）への文字列参照。展開状態は現在 `ProjectScreen` のローカル `useState` で管理されており、画面遷移でリセットされる。

## Goals / Non-Goals

**Goals:**
- ジャンルバッジに `Genre.color` を背景色として表示する
- タスクツリーの展開状態を `localStorage` に永続化し、プロジェクトごと・再起動後も保持する
- `Task` に `occurredAt`（発生日）と `dueAt`（期限日）を追加し、Project 画面で表示・編集できるようにする
- 発生日は新規タスク追加時の日付をデフォルト値とする
- タスク追加日 `createdAt` は引き続き保持する
- 編集フォームのジャンル選択・タグ入力を横並び、確定・キャンセルボタンを横並び・色分けにする

**Non-Goals:**
- 期限日によるソート・フィルタリング
- 発生日・期限日の入力ウィジェット（日付ピッカーライブラリ）の導入（`<input type="date">` を使用）
- 既存タスクの `occurredAt` のマイグレーション（`null` で読み込む）

## Decisions

### 1. Task 型の拡張

```ts
export type Task = {
  // ...既存フィールド...
  occurredAt: string | null  // 発生日（ISO 8601 date 文字列 "YYYY-MM-DD"、またはnull）
  dueAt: string | null       // 期限日（ISO 8601 date 文字列 "YYYY-MM-DD"、またはnull）
}
```

`createdAt` は `new Date().toISOString()`（datetime）のまま保持。
`occurredAt` のデフォルト値は `new Date().toISOString().slice(0, 10)`（当日の日付文字列）。

### 2. ジャンルバッジのカラー表示

`TaskItem.tsx` でジャンルバッジをレンダリングする際、`useData()` から `genres` を取得し、`task.genre` にマッチする `Genre` オブジェクトを探して `color` を適用する。

```tsx
const genreObj = genres.find((g) => g.name === displayGenre)
const badgeStyle = genreObj ? { backgroundColor: genreObj.color, color: '#fff' } : {}
<span className="task-genre" style={badgeStyle}>{displayGenre}</span>
```

### 3. 展開状態の永続化

`localStorage` のキーは `laurel:expand:${projectId}` とし、展開中のタスク ID の配列を JSON で保存する。

- 初期化時: `localStorage` からロードし `Set<string>` を復元
- 展開/折りたたみ操作時: 変更後の `Set` を `localStorage` に書き込む
- プロジェクト切り替え時: `useEffect([projectId])` でそのプロジェクトの値をロード

```ts
const storageKey = `laurel:expand:${projectId}`
// 読み込み
const saved = localStorage.getItem(storageKey)
const initial = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>()
// 書き込み（handleToggleExpand 内）
localStorage.setItem(storageKey, JSON.stringify([...next]))
```

### 4. 発生日・期限日の表示

タスク行（非編集時）で発生日と期限日を表示する。どちらも `null` の場合は何も表示しない。
期限日が過去の場合は強調表示（赤字）する。

```
[ ステータス ] タスク名  [ジャンル]  📅 2026-03-10  ⏰ 2026-03-20
```

### 5. 発生日・期限日の編集

編集フォームに `<input type="date">` を2つ追加する（発生日、期限日）。
値が空の場合は `null` として保存する。

### 6. 編集フォームのレイアウト

```
[ タスク名入力欄（全幅） ]
[ ジャンル選択 ]  [ タグ入力エリア（横並び） ]
[ 発生日 ]  [ 期限日 ]
[ 確定（青） ] [ キャンセル（グレー） ]
```

- ジャンル選択とタグ入力: `display: flex; gap: 8px` で横並び、タグエリアを `flex: 1` で伸張
- 確定ボタン: 青背景（`#3b82f6`）
- キャンセルボタン: グレー背景（`#6b7280`）

## ファイル変更一覧

| ファイル | 変更内容 |
|---|---|
| `src/renderer/src/types.ts` | `Task` 型に `occurredAt`, `dueAt` を追加 |
| `src/renderer/src/context/DataContext.tsx` | `createTask` で `occurredAt` デフォルト値を設定 |
| `src/renderer/src/screens/ProjectScreen.tsx` | 展開状態を `localStorage` で永続化 |
| `src/renderer/src/components/TaskItem.tsx` | ジャンルバッジにカラー適用、発生日・期限日の表示・編集、編集フォームのレイアウト改善 |
| `src/renderer/src/index.css` | ジャンルバッジカラー、日付表示・フォームスタイル、編集フォームレイアウト |

## Risks / Trade-offs

- [localStorage のキー衝突] プロジェクト ID は ULID なので衝突は実質ゼロ。
- [既存タスクの occurredAt] 既存データには `occurredAt`/`dueAt` フィールドがなく `undefined` で読み込まれる。型的には `null` 扱いとし、表示・編集時は `null` として処理する。
- [日付文字列フォーマット] `<input type="date">` の値は `"YYYY-MM-DD"` 形式。タイムゾーン考慮は不要（ローカル日付として扱う）。
