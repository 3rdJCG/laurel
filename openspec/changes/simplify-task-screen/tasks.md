## 1. KanbanView コンポーネントの作成

- [x] 1.1 `src/renderer/src/components/KanbanView.tsx` を新規作成する（4列固定、props: projectId, parentTaskId）
- [x] 1.2 `KanbanView` 内に `KanbanCard` コンポーネントを実装する（タイトル、タグ・期限バッジ、削除ボタン）
- [x] 1.3 `KanbanCard` のタイトルクリックでインライン編集できるようにする
- [x] 1.4 各列の下部に「＋ タスクを追加」フォームを実装する（クリック→テキスト入力→Enter確定）
- [x] 1.5 フォームからタスクを追加する際、そのステータスを列のステータスに設定して `createTask` を呼び出す
- [x] 1.6 `KanbanCard` のステータスバッジをクリックするとステータス選択UIが表示され `updateTask` を呼び出す

## 2. TaskDetailScreen の再設計

- [x] 2.1 `TaskDetailScreen` からルートタスク情報を表示するヘッダーセクション（タイトル・ジャンル・タグ・期限・発生日）を実装する
- [x] 2.2 タスク情報ヘッダーでインライン編集（タイトル・ジャンル・タグ）を実装し `updateTask` と連携する
- [x] 2.3 `TaskDetailScreen` の Tasks タブの内容を `KanbanView` に置き換える
- [x] 2.4 既存の子タスクリスト表示（`TaskItem` のルートタスクラッパー部分）を削除する

## 3. 1階層制限の適用

- [x] 3.1 `TaskItem` のサブタスク追加ボタン表示条件を `depth === 0`（ルートタスクのみ）に変更する
- [x] 3.2 `ProjectScreen`（ルートタスクリスト）でサブタスク追加が引き続き機能することを確認する

## 4. TaskDetailTab の廃止

- [x] 4.1 `TaskDetailTab.tsx` への参照（import）がないことを確認する
- [x] 4.2 `TaskDetailTab.tsx` を削除する

## 5. スタイル調整

- [x] 5.1 Kanbanボードのレイアウト（4列グリッド）のCSSを `index.css` に追加する
- [x] 5.2 `KanbanCard` のカードスタイル（白背景・ボーダー・パディング）をCSSに追加する
- [x] 5.3 タスク情報ヘッダーのスタイルをCSSに追加する

## 6. 動作確認

- [x] 6.1 既存の子タスクがKanban列に正しく分類されて表示されることを確認する
- [x] 6.2 Kanbanから子タスクを追加・削除・ステータス変更できることを確認する
- [x] 6.3 タスク情報ヘッダーでタイトル・タグ・ジャンルを編集できることを確認する
- [x] 6.4 `npm run typecheck` でTypeエラーがないことを確認する
