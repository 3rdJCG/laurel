## Why

タスク詳細画面の要素が多すぎてシンプルさが損なわれている。無制限の階層ネストと複数のビューモードが並立しており、ユーザーが何を見るべきかわかりにくい。タスク管理の軸をシンプルにし、子タスクの把握にはKanbanビューを活用することで、直感的かつ実用的な画面に整理する。

## What Changes

- **階層を1階層に制限**: ルートタスクに対して直接の子タスク（1階層）のみを持てるようにする。現在の再帰的な無制限ネストを廃止する
- **Kanbanビューの追加**: タスク詳細画面の「Tasks」タブ内にKanbanビューを追加し、子タスクをステータス列（TODO / 進行中 / レビュー中 / 完了）で確認できるようにする
- **TaskDetailTabの廃止・統合**: 現在の `TaskDetailTab`（再帰ツリー表示）を廃止し、タスク詳細情報（タイトル・ジャンル・タグ）の表示をシンプルな詳細ヘッダーに集約する
- **TaskDetailScreen のビュー整理**: タスク詳細画面は「タスク情報ヘッダー」＋「子タスクKanban」＋「Issues タブ」の構成に整理する

## Capabilities

### New Capabilities

- `task-kanban-view`: タスク詳細画面内で子タスクをKanbanビュー（ステータス列）で表示・管理する機能。子タスクのステータス変更、新規追加に対応する

### Modified Capabilities

- なし（既存スペックファイルなし）

## Impact

- `src/renderer/src/screens/TaskDetailScreen.tsx`: 主要な変更対象。Kanbanビューの追加、TaskDetailTabの廃止
- `src/renderer/src/components/TaskDetailTab.tsx`: 廃止または大幅簡素化
- `src/renderer/src/components/TaskItem.tsx`: 子タスク生成ロジックが1階層制限の影響を受ける可能性
- `src/renderer/src/context/DataContext.tsx`: `createTask` の階層バリデーション追加が必要な可能性
- 既存の `TaskItem` コンポーネントはKanbanカードとして再利用または新規カードコンポーネントを作成
