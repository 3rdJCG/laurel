## Why

画面構成 Change（define-screen-layout）で Project・Task の型を暫定的に仮置きしたが、アプリの中心的なデータ構造として正式に定義する必要がある。実装前にフィールドの意味・制約・関係を確定させることで、画面実装・永続化・将来の機能拡張の土台を作る。

## What Changes

- `Project` 型の正式なフィールド定義（id・name・createdAt）
- `Task` 型の正式なフィールド定義（id・projectId・title・done・createdAt）
- 各フィールドの制約（必須・型・初期値など）を仕様として明文化
- `src/renderer/src/types.ts` への型定義の実装

## Capabilities

### New Capabilities

- `project-model`: Project エンティティの構造・フィールド・制約の定義
- `task-model`: Task エンティティの構造・フィールド・制約・Project との関係の定義

### Modified Capabilities

（なし）

## Impact

- `src/renderer/src/types.ts` に `Project` 型・`Task` 型を実装
- この型定義は `define-screen-layout` の画面実装・将来の永続化 Change が依存する