## Why

アプリを再起動するたびにウィンドウがデフォルトサイズ・位置にリセットされる。ユーザーが好みのサイズや配置にカスタマイズしても次回起動時に失われ、毎回手動で調整し直す必要がある。`implement-data-persistence` はタスク・プロジェクトデータの保存を扱っており、ウィンドウ状態の永続化は対象外であるため、別の変更として管理する。

## What Changes

- アプリ終了時にウィンドウのサイズ（幅・高さ）と位置（x・y）を保存する
- 次回起動時に保存済みの状態を復元してウィンドウを生成する
- 保存先は Electron の `app.getPath('userData')` 配下の専用ファイル

## Capabilities

### New Capabilities
- `window-state`: ウィンドウのサイズと位置をファイルに保存・復元する機能

### Modified Capabilities

## Impact

- `src/main/index.ts`（Electron メインプロセス）: `BrowserWindow` 生成ロジックの変更
- 新規ファイル: ウィンドウ状態の読み書きユーティリティ（例: `src/main/windowState.ts`）
- 保存先: `<userData>/window-state.json`（タスクデータとは別ファイル）
- 外部依存追加なし（Node.js の `fs` + Electron API のみ使用）