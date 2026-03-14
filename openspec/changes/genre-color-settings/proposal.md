## Why

現在の設定画面（`SettingsScreen`）ではジャンルを文字列の一覧として管理しているが、色情報を持たないためタスク一覧でジャンルを視覚的に区別できない。ジャンルに色を付与することで、タスク一覧での視認性が向上し、素早いスキャンが可能になる。

## What Changes

- `Genre` 型を `string` から `{ name: string; color: string }` に変更する
- 設定画面のジャンル管理 UI に色ピッカーを追加する
- 色ピッカーはプリセットカラーパレット（複数色）から選択でき、さらにカラーコード（hex）の手入力にも対応する
- 新規ジャンル追加時はデフォルト色（パレット先頭色）を自動割り当てする
- 既存ジャンルデータ（`string[]`）はマイグレーション処理でデフォルト色を付与して読み込む

## Capabilities

### New Capabilities

- `genre-color`: ジャンルに色を設定・変更する機能

### Modified Capabilities

- `genre-management`: ジャンルの追加・削除に加え、色変更を設定画面で行えるように拡張

## Impact

- `src/renderer/src/types.ts` に `Genre` 型を追加
- `src/renderer/src/screens/SettingsScreen.tsx` のジャンル管理 UI を拡張（色ピッカー追加）
- `src/main/index.ts` の `settings:get` / `settings:set` ハンドラで `genres` フィールドのマイグレーション対応
- `src/renderer/src/index.css` に色ピッカー・パレット用スタイルを追加
