## Why

`implement-data-persistence` が IPC チャンネルを定義したが、起動時のデータロードの呼び出し元・タイミングが未定義のため実装が進められない。また `home-screen` 仕様にはプロジェクト作成の UI 形式が欠けており、さらに Home 画面のタスク追加要件が `project-root-task-creation-ui` と重複していて整合性がとれていない。これら3つの仕様ギャップを一括で解消する。

## What Changes

- **アプリ起動時データロードフローの定義**: レンダラーがマウント時に `data:load-all` を invoke する責務を持つことを明確化し、useEffect の依存関係と初期ローディング状態を規定する
- **プロジェクト作成 UI の定義**: Home 画面本体にインラインフォーム展開方式でプロジェクト作成できる UI を新規仕様として追加する（`project-root-task-creation-ui` と同じ方式）
- **BREAKING: Home 画面のタスク追加要件を削除**: `home-screen/spec.md` の「Home 画面からタスクを追加しプロジェクトに分類する」要件を削除し、タスク追加は Project 画面のみに統一する

## Capabilities

### New Capabilities
- `app-data-load-flow`: アプリ起動時のデータロードフロー（誰が・いつ・どのように `data:load-all` を呼ぶか、ローディング状態の扱い）
- `project-creation-ui`: Home 画面でのプロジェクト作成 UI（インラインフォーム展開、ボタン配置、確定/キャンセル操作）

### Modified Capabilities
- `home-screen`: 「タスクの新規追加とプロジェクトへの分類」要件を削除する。タスク追加は Project 画面の責務に統一するため。

## Impact

- `src/renderer/src/App.tsx` または App 直下の初期化コンポーネント（`data:load-all` の invoke 追加）
- `src/renderer/src/` の Home 画面コンポーネント（プロジェクト作成 UI 追加）
- `home-screen` 仕様との整合：既存の Home 画面実装がある場合、タスク追加 UI の削除が必要になる（ただし現時点で実装は存在しない）