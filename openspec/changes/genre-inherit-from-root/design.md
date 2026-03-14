## Context

Laurel のタスクはツリー構造（`parentId` で親子関係を管理）。ルートタスクは `parentId === null`。`TaskItem.tsx` はすべてのタスクで `GenrePicker` を表示している。`DataContext.createTask` はサブタスク作成時に `inheritFrom` の `genre` を引き継いでいる。

## Goals / Non-Goals

**Goals:**
- ジャンル編集をルートタスクのみに制限する
- サブタスクのジャンルバッジはルートタスクのジャンルを表示する
- サブタスク新規作成時はジャンルを設定しない（`null`）

**Non-Goals:**
- 既存サブタスクに設定済みの `genre` データのマイグレーション（表示はルートから引くため影響なし）
- タスクを別のルートへ移動したときのジャンル更新

## Decisions

### 1. ルートタスクのジャンルを参照するヘルパー

`TaskItem` 内で `allTasks` を使い、タスクの祖先を辿ってルートタスクを見つける。

```ts
const findRootTask = (taskId: string, tasks: Task[]): Task | undefined => {
  let current = tasks.find((t) => t.id === taskId)
  while (current?.parentId !== null) {
    current = tasks.find((t) => t.id === current!.parentId)
  }
  return current
}
```

### 2. TaskItem の表示・編集ロジック

| タスク種別 | 編集フォーム | ジャンルバッジ（表示行） |
|---|---|---|
| ルートタスク（`parentId === null`） | `GenrePicker` を表示 | `task.genre` を使用 |
| サブタスク（`parentId !== null`） | ジャンル欄を非表示 | ルートタスクの `genre` を表示 |

- サブタスクの編集フォームでは `editGenre` ステートを使わない（保存時も `genre` フィールドを更新しない）
- ジャンルバッジ部分: `isRoot ? task.genre : rootTask?.genre ?? null` で取得する

### 3. DataContext.createTask の変更

`inheritFrom` からジャンルを引き継ぐ処理を削除し、サブタスク作成時は常に `genre: null` とする。

```ts
genre: null,  // ルートタスクのジャンルをバッジ表示時に参照するため保存不要
```

### 4. handleEditConfirm の変更

サブタスクの編集確定時に `genre` フィールドを `updateTask` に含めない。

```ts
const changes: Partial<Task> = { title, tags: editTags }
if (task.parentId === null) changes.genre = editGenre || null
await updateTask(task.projectId, task.id, changes)
```

## ファイル変更一覧

| ファイル | 変更内容 |
|---|---|
| `src/renderer/src/components/TaskItem.tsx` | `findRootTask` 追加、サブタスク編集フォームから `GenrePicker` 除去、ジャンルバッジをルート参照に変更、`handleEditConfirm` でサブタスクは `genre` を更新しない |
| `src/renderer/src/context/DataContext.tsx` | `createTask` で `genre: null` に固定（`inheritFrom` からの継承を削除） |

## Risks / Trade-offs

- [既存サブタスクの genre データ] 既存データでサブタスクに `genre` が設定されていても、表示はルートから取るため問題なし。データ自体は残るが UI から変更できない。
- [ルートタスク移動] タスクの親子関係を変更する機能は現状ないため、ルート変更シナリオは考慮外。
