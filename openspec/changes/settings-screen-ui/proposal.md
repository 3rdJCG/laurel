## Why

`implement-data-persistence` change がバックエンド（`settings.ts`・`settings:get`/`settings:set` IPC）を実装するが、ユーザーが保存先フォルダを確認・変更するための設定画面 UI が定義されていない。設定機能を実際に使えるようにするには、対応するフロントエンド画面が必要。

## What Changes

- アプリ内に設定画面（モーダルまたは専用ビュー）を追加する
- 現在の保存先フォルダパスを表示する
- OS のフォルダ選択ダイアログを使って保存先を変更できる
- UNC パス（`\\server\share\folder`）を手入力で指定できるテキストフィールドを提供する
- 保存先変更時にエラー（アクセス不可・存在しないパス）を UI 上で通知する
- 設定画面を開くためのエントリポイント（ナビゲーションボタン等）をメイン画面に追加する

## Capabilities

### New Capabilities

- `settings-screen`: 保存先フォルダを確認・変更できる設定画面 UI

### Modified Capabilities

（なし）

## Impact

- `src/renderer/src/` に設定画面コンポーネントを追加
- `src/preload/index.ts` に `dialog:open-folder` IPC ブリッジを追加（OS フォルダ選択ダイアログ呼び出し）
- `src/main/index.ts` に `dialog:open-folder` IPC ハンドラーを追加（`dialog.showOpenDialog`）
- `App.tsx` またはナビゲーション層に設定画面へのルーティングを追加
- `implement-data-persistence` の `settings:get` / `settings:set` IPC に依存