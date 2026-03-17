## 1. フィルタリングロジック

- [x] 1.1 `filterTasksByVisibility(tasks: Task[], showCompleted: boolean): Task[]` 関数を実装する（再帰的に `done` タスクと子孫を除外）
- [x] 1.2 `status === 'done'` の親タスクを除外したとき、子タスクも除外されることをユニットテストで確認する

## 2. ProjectScreen の状態追加

- [x] 2.1 `ProjectScreen` コンポーネントに `showCompletedTasks` state（`boolean`、初期値 `true`）を追加する
- [x] 2.2 タスクリスト描画前に `filterTasksByVisibility` を適用する

## 3. トグルボタン UI

- [x] 3.1 Project 画面のタスクリスト上部ツールバーにトグルボタンを追加する
- [x] 3.2 `showCompletedTasks` が `true` のとき「完了を隠す」、`false` のとき「完了を表示」と表示する
- [x] 3.3 ボタンのスタイルを既存の UI スタイルに合わせて調整する
