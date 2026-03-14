## Why

現在のタスク編集フォームではジャンルをフリーテキストで入力できるため、同じジャンルを別の表記で登録してしまう（例: 「仕事」と「Work」）などの表記ゆれが起きやすい。ジャンルを設定画面で事前登録した一覧からのみ選択できるようにすることで、タスク間の一貫性と絞り込みの精度が向上する。また、タスク編集中に「このジャンルがない」と気づいた場合でも、設定画面に移動することなくその場で新規ジャンルを追加できる手段を提供する。

## What Changes

- タスク編集フォームのジャンル入力をフリーテキストから **登録済みジャンルのセレクト UI** に変更する
- セレクト UI 内に「+ 新しいジャンルを追加」オプションを設け、クリックするとインラインで新規ジャンル名を入力・登録できるようにする
- 新規ジャンルはデフォルト色（`#6b7280`）で登録され、設定画面のジャンル一覧にも即時反映される
- `DataContext` に登録済みジャンル一覧（`genres: Genre[]`）を公開し、タスク関連コンポーネントから参照できるようにする

## Capabilities

### New Capabilities

- `task-genre-quick-add`: タスク編集フォームから直接ジャンルを新規登録する機能

### Modified Capabilities

- `genre-management`: タスク編集フォームからも新規ジャンルを追加できるように拡張
- `task-edit`: ジャンルフィールドをフリーテキスト入力からセレクト UI に変更

## Impact

- `src/renderer/src/context/DataContext.tsx`: `genres` 状態と `addGenre` 関数を追加し、設定を購読する
- `src/renderer/src/components/TaskItem.tsx`: ジャンル入力を `GenrePicker` コンポーネントに置き換える
- `src/renderer/src/components/GenrePicker.tsx`: 新規作成（登録済みジャンルのセレクト + クイック追加 UI）
- `src/renderer/src/index.css`: `GenrePicker` のスタイルを追加
