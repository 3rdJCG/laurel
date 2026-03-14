## Why

タスク管理 UI の使い勝手を複数の面で改善する。ジャンルに設定した色がタスク一覧で活かされていない、画面遷移のたびに展開状態がリセットされる、タスクの時間軸情報（発生日・期限日）が扱えない、編集フォームのレイアウトが縦積みで使いにくい、といった課題をまとめて解消する。

## What Changes

- **ジャンルバッジのカラー表示**: Project 画面のタスク行に表示されるジャンルバッジに、`Genre.color` を背景色として反映する
- **展開状態の永続化**: ルートタスクの展開/折りたたみ状態を `localStorage` に保存し、プロジェクト画面を離れても・再起動後も同じ状態を復元する
- **タスクに発生日・期限日を追加**: `Task` 型に `occurredAt: string | null`（発生日）と `dueAt: string | null`（期限日）を追加し、Project 画面で表示・編集できるようにする
  - 発生日のデフォルト値は新規タスク追加時の日付
  - 内部的にはタスク追加日（`createdAt`）は引き続き保持する
- **タスク編集 UI のレイアウト改善**: 編集フォームでジャンル選択とタグ入力エリアを横並びにし、確定・キャンセルボタンも横並び・色分けする

## Capabilities

### New Capabilities

- `task-dates`: タスクに発生日・期限日を設定・表示する機能
- `expand-state-persistence`: タスクツリーの展開状態を永続化する機能

### Modified Capabilities

- `genre-color`: ジャンルバッジに設定カラーを反映（Project 画面）
- `task-edit`: 編集フォームのレイアウト改善（横並び、ボタン色分け）

## Impact

- `src/renderer/src/types.ts`: `Task` 型に `occurredAt`, `dueAt` フィールドを追加
- `src/renderer/src/context/DataContext.tsx`: `createTask` で `occurredAt` のデフォルト値（当日 ISO 文字列）を設定する
- `src/renderer/src/screens/ProjectScreen.tsx`: 展開状態を `localStorage` で永続化
- `src/renderer/src/components/TaskItem.tsx`: ジャンルバッジに色を適用、発生日・期限日の表示と編集フォームを追加、編集レイアウト改善
- `src/renderer/src/index.css`: ジャンルバッジのカラースタイル、日付フィールドのスタイル、編集フォームの横並びレイアウト
