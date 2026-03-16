## Why

現在の実装では階層インデントを `.task-item` 全体の `marginLeft` で表現しているため、深さの違うタスク間でタスク名・タグ列の水平位置がずれる。また、ジャンルバッジが存在するルートタスクとしないサブタスクでもタスク名の開始位置がずれる。列を揃えることで一覧としての視認性が向上する。

## What Changes

- `.task-item` の `marginLeft` によるインデントをやめ、インデント量を行内の左スペーサー（CSS変数 `--task-depth`）として表現する
- `.task-row` を CSS Grid レイアウトに変更し、全タスクで列位置が水平方向に一致するようにする
  - 列構成: `[インデントスペーサー] [ドラッグ] [展開] [ジャンルスロット(固定幅)] [タスク名+タグ(可変)] [ステータス] [アクション]`
  - ジャンルスロットはルートタスク以外でも同幅の空領域を確保し、タスク名の開始位置を統一する

## Capabilities

### Modified Capabilities

- `task-display`: タスク行を Grid レイアウトで列揃えに変更

## Impact

- `src/renderer/src/components/TaskItem.tsx`: `marginLeft` → CSS変数 `--task-depth` への変更、ジャンルスロットラッパー追加
- `src/renderer/src/index.css`: `.task-row` を Grid レイアウトに変更、関連スタイルの調整
