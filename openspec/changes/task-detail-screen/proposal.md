## Why

プロジェクト画面のルートタスクは現在リスト表示のみで、タスクの詳細確認・編集・議論の記録を同一画面でおこなえない。各ルートタスクに専用の個別ページを設けることで、GitHub の Issue ページに近い体験（詳細閲覧・インライン編集・会話の記録）を提供する。

会話機能を使う際にはコメント投稿者を識別するためのユーザー情報が必要なため、設定に表示名（`name`）とメールアドレス（`mailAddress`）を追加する。

## What Changes

- ルートタスクをクリックすると専用の `TaskDetailScreen` へ遷移する
- `TaskDetailScreen` は **detail** タブと **conversation** タブの2タブ構成
- detail タブ: ルートタスクおよびサブタスクの状態確認・タスク名/ジャンル/タグのインライン編集
- conversation タブ: ツリー状のコメントスレッド（GitHub Issue の会話欄に相当）
  - 投稿者の表示名を表示し、操作でメールアドレスも確認できる
- 設定（`AppSettings`）に `name`（表示名）と `mailAddress` フィールドを追加
- `SettingsScreen` でこれらの新フィールドを編集できるようにする

## Capabilities

### New Capabilities

- `task-detail-screen`: ルートタスク個別ページ（detail / conversation タブ）
- `task-conversation`: タスクに紐づくツリー状コメントスレッド
- `user-profile-settings`: 設定画面で表示名・メールアドレスを編集する機能

### Modified Capabilities

- `settings-screen`: `name` / `mailAddress` フィールドの追加
- `project-screen`: ルートタスクをクリックして detail 画面へ遷移するナビゲーション追加

## Impact

- `src/renderer/src/screens/TaskDetailScreen.tsx` を新規作成
- `src/renderer/src/components/Sidebar.tsx` の `View` 型に `{ type: 'task'; projectId: string; taskId: string }` を追加
- `src/renderer/src/App.tsx` の `renderMain` に `task` ケースを追加
- `src/renderer/src/screens/ProjectScreen.tsx` でルートタスクに detail 画面への遷移を追加
- `src/renderer/src/screens/SettingsScreen.tsx` に `name` / `mailAddress` フィールドを追加
- `src/main/storage/settings.ts` の `AppSettings` 型に `name` / `mailAddress` を追加
- `src/renderer/src/types.ts` に `Comment` 型を追加
- `src/main/storage/projectStore.ts` にコメントの保存・読み込みロジックを追加
- `src/preload/index.ts` に会話関連の IPC API を追加
