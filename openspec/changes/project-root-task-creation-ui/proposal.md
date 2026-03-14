## Why

`define-task-operations-ui` は subtask-creation（子タスク追加）を定義したが、Project 画面でルートタスク（`parentId` なし）を新規追加する操作のUI仕様がない。`define-screen-layout` の `home-screen` にはタスク作成の記述があるが、Project 画面での作成フローは未定義のまま実装が進められない状態である。

## What Changes

- Project 画面にルートタスク追加 UI を追加する（インライン入力フォームまたはボタン起動フォーム）
- ルートタスク作成は **Project 画面** で行う。Home 画面でのタスク作成（`home-screen` スペック）は別フローとして共存させる

## Capabilities

### New Capabilities

- `project-root-task-creation`: Project 画面でルートタスク（`parentId` なし）を追加する機能

### Modified Capabilities

（なし）

## Impact

- `src/renderer/src/screens/ProjectScreen.tsx` にルートタスク追加 UI を追加
- `src/renderer/src/types.ts` の `Task` 型は変更なし（既存定義を利用）
- IPC レイヤー（`data:save-project`）は既存のものを利用