## Why

現在のタスク構造では、サブタスクにも個別にジャンルを設定できるが、ツリー内でジャンルが異なるタスクが混在すると分類が煩雑になる。ジャンルはプロジェクト内の作業の分類単位であり、ルートタスク（最上位タスク）が属するジャンルを一貫してツリー全体に適用する方が自然でシンプルなモデルになる。

## What Changes

- ジャンルはルートタスク（`parentId === null`）にのみ設定できる
- サブタスク（`parentId !== null`）のジャンルは、ルートタスクのジャンルを表示するが編集不可とする
- タスク編集フォームで、サブタスクにはジャンル選択 UI（`GenrePicker`）を表示しない
- サブタスク作成時は `genre` フィールドを設定しない（`null` で作成）
- タスク一覧でのジャンルバッジ表示は、サブタスクに対してもルートタスクのジャンルを参照する

## Capabilities

### Modified Capabilities

- `task-edit`: ルートタスクのみジャンル編集可能に制限
- `genre-management`: ジャンルの適用範囲をタスクツリー単位に統一

## Impact

- `src/renderer/src/components/TaskItem.tsx`: サブタスク編集フォームから `GenrePicker` を除去し、ジャンルバッジ表示をルートタスクのジャンルから取得するよう変更
- `src/renderer/src/context/DataContext.tsx`: `createTask` でサブタスク作成時に `genre: null` を設定する（`inheritFrom` によるジャンル継承を削除）
