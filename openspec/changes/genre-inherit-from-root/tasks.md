## 1. DataContext の変更

- [x] 1.1 `DataContext.tsx` の `createTask` でサブタスク作成時の `genre` を `null` に固定する（`inheritFrom?.genre` の引き継ぎを削除）

## 2. TaskItem の変更

- [x] 2.1 `TaskItem.tsx` に `findRootTask(taskId: string, tasks: Task[]): Task | undefined` ヘルパーを追加する（`parentId` を辿って `parentId === null` のタスクを返す）
- [x] 2.2 `isRoot` 変数（`task.parentId === null`）を追加する
- [x] 2.3 編集フォームの `GenrePicker` を `isRoot` のときのみ表示するよう条件分岐を追加する
- [x] 2.4 `handleEditConfirm` でサブタスク（`!isRoot`）の場合は `genre` を `updateTask` に含めないよう修正する
- [x] 2.5 タスク表示行のジャンルバッジを、サブタスクの場合はルートタスクの `genre` を参照するよう変更する

## 3. 動作確認

- [x] 3.1 `npm run typecheck` でエラーがないことを確認する
- [x] 3.2 ルートタスクの編集フォームに `GenrePicker` が表示されることを確認する
- [x] 3.3 サブタスクの編集フォームにジャンル欄が表示されないことを確認する
- [x] 3.4 サブタスクのジャンルバッジにルートタスクのジャンルが表示されることを確認する
- [x] 3.5 新規サブタスク作成時にジャンルが設定されないことを確認する
