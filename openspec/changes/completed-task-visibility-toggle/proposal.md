## Why

`done` ステータスのタスクがどう扱われるかの仕様が存在しないため、Project 画面に完了タスクが無制限に表示され続ける。完了タスクが増えると未完了タスクが埋もれ、作業中の項目を把握しにくくなる。

## What Changes

- Project 画面に「完了タスクの表示／非表示」トグルボタンを追加する
- デフォルトは「表示」。トグルで非表示にすると `done` タスクがリストから隠れる
- トグル状態はセッション中保持する（永続化は対象外）

## Capabilities

### New Capabilities
- `completed-task-visibility`: Project 画面で完了タスクの表示・非表示を切り替えるトグル機能

### Modified Capabilities
<!-- なし -->

## Impact

- `src/renderer/src/` 以下の Project 画面コンポーネント（タスクリスト表示部分）
- タスクフィルタリングロジック（新規追加）
- UI: トグルボタンの配置とスタイル