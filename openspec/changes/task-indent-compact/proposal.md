## Why

現在の実装では `marginLeft: depth * 20px` で階層インデントを表現しているが、幅が大きすぎてタスク名が画面端に押し出される。深い階層ほど視認性が悪化する。`∟` のような接続記号と小さなインデントを組み合わせることで、階層構造を保ちながらコンパクトに表示できる。

## What Changes

- 階層インデント幅を `depth * 20px` から `depth * 12px` に縮小する
- 各サブタスクの行頭に `∟` 記号を追加し、親子関係を視覚的に示す（ルートタスクには表示しない）

## Capabilities

### Modified Capabilities

- `task-display`: タスクツリーの表示をよりコンパクトに変更

## Impact

- `src/renderer/src/components/TaskItem.tsx`: インデント幅の縮小、`∟` 記号の追加
