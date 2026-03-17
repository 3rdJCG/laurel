## Why

`define-project-task-model` でタスクモデル（`status`, `genre`, `tags`, `parentId`）が定義されたが、それを操作するUIがどこにも仕様化されていない。タスク管理アプリとして機能するためには、タスクの作成後に状態変更・編集・削除・サブタスク追加ができなければならない。

## What Changes

- タスクのステータス変更UI（`todo` → `in-progress` → `in-review` → `done`）をプロジェクト画面に追加
- タスクの編集UI（タイトル・genre・tagsの変更）を追加
- タスクの削除UI（確認フロー付き）を追加
- サブタスクの作成UI（`parentId` 付きタスクの追加、5層制限のガード含む）を追加

## Capabilities

### New Capabilities

- `task-status-change`: プロジェクト画面のタスク一覧からステータスをインラインで変更する機能
- `task-edit`: タスクのタイトル・genre・tagsをインライン編集する機能
- `task-delete`: タスクを削除する機能（確認ダイアログ付き）
- `subtask-creation`: 既存タスクに対してサブタスクを追加する機能（最大5層制限のUIガード付き）

### Modified Capabilities

（なし）

## Impact

- `src/renderer/src/screens/ProjectScreen.tsx` にステータス変更・編集・削除・サブタスク追加のUI要素を追加
- `src/renderer/src/types.ts` の `Task` 型は変更なし（既存定義を利用）
- IPC レイヤー（`data:save-project`）は既存のものを利用