## Why

`define-screen-layout` の Home 画面 spec ではプロジェクトの**追加**のみが定義されており、プロジェクト名の変更や削除が仕様化されていない。プロジェクト管理アプリとして最低限の CRUD を揃えるために、編集と削除のUI仕様を追加する。

## What Changes

- Home 画面のプロジェクトカードに「名前を変更」操作を追加
- Home 画面のプロジェクトカードに「削除」操作を追加（確認フロー付き）
- プロジェクト削除時に紐付くすべてのタスクも連鎖削除されることを仕様として定義

## Capabilities

### New Capabilities

- `project-edit`: プロジェクト名をインライン編集する機能
- `project-delete`: プロジェクトを削除する機能（紐付くタスクの連鎖削除・確認フロー付き）

### Modified Capabilities

（なし）

## Impact

- `src/renderer/src/screens/HomeScreen.tsx` のプロジェクトカードに編集・削除のUI要素を追加
- プロジェクト削除時は `data:delete-project` IPC（`implement-data-persistence` で定義済み）を使用
- プロジェクト名変更時は `data:save-project` IPC を使用