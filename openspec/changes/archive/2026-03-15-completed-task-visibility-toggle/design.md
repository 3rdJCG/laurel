## Context

Project 画面（`ProjectScreen.tsx`）はタスクリストを表示するコンポーネント。現時点では実装がまだ進行中で、タスクの表示状態管理はコンポーネントの `useState` で行う方針（`task-display-operations-ux/design.md` より）。expand/collapse 状態と同様に、完了タスクの表示状態もローカル state で管理するのが自然。

## Goals / Non-Goals

**Goals:**
- Project 画面に「完了タスクを表示／非表示」トグルボタンを配置する
- デフォルト: 完了タスクを表示（`showCompleted = true`）
- トグルをオフにすると `status === 'done'` のタスクをリストから除外して表示する
- 非表示時は親タスクが `done` の場合、その子ツリーごと非表示にする

**Non-Goals:**
- トグル状態の永続化（セッション中のみ保持）
- タスク検索・フィルタの一般化（この変更では done 専用トグルのみ）
- 完了タスクの件数バッジ表示

## Decisions

### 1. 状態管理: `useState` をそのまま使用
`expand/collapse` 状態と同様、`showCompletedTasks: boolean` を ProjectScreen の `useState` に追加する。外部ストアや Context は不要。

**理由**: 表示状態はセッション限りで良く、他コンポーネントと共有する必要がない。

### 2. フィルタリングの適用単位
ルートタスク（`parentId === null`）のうち `done` のものを非表示にする。また、`done` でない親の子タスクが `done` の場合も非表示対象とする。

再帰的なフィルタリング関数をリスト描画の前段に置く:
```
filterTasks(tasks, showCompleted) → filteredTasks
```
親が `done` であれば子ごとフィルタする。

### 3. トグルボタンの配置
Project 画面のタスクリスト上部のツールバー行に配置する（タスク追加ボタンと横並び、または右端）。アイコン＋テキストのボタンか、チェックボックス形式でも可。

**テキスト案**: `完了を表示` / `完了を隠す`（または `Show done` / `Hide done` の英語表記に統一）

## Risks / Trade-offs

- [Risk] 子タスクが `done` で親が `done` でない場合に子のみ非表示 → 親に「hidden children」の視覚的なヒントがないと混乱する可能性
  → Mitigation: まず単純に子も非表示。UX の問題が出た場合に件数バッジ追加を別タスクで検討。

- [Trade-off] ローカル state のみなのでページ遷移すると状態がリセットされる
  → 許容。永続化は将来の改善とする。