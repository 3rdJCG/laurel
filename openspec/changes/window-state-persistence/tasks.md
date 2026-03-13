## 1. windowState ユーティリティの実装

- [x] 1.1 `src/main/windowState.ts` を新規作成し、`WindowState` 型（`width`, `height`, `x?`, `y?`）を定義する
- [x] 1.2 `loadWindowState(): WindowState` を実装する（ファイル未存在・パース失敗時はデフォルト値 `{width: 900, height: 670}` を返す）
- [x] 1.3 `saveWindowState(win: BrowserWindow): void` を実装する（`close` 前に呼び出す想定）
- [x] 1.4 復元位置が現在の表示領域外のとき `x/y` を省略するバリデーションロジックを `loadWindowState` に追加する（`screen.getAllDisplays()` を使用）

## 2. メインプロセスへの組み込み

- [x] 2.1 `src/main/index.ts` の `createWindow()` で `loadWindowState()` を呼び出し、返値を `BrowserWindow` コンストラクタの `width/height/x/y` に渡す
- [x] 2.2 `mainWindow` の `close` イベントで `saveWindowState(mainWindow)` を呼び出すリスナーを登録する

## 3. 動作確認

- [ ] 3.1 開発モード（`npm run dev`）でウィンドウをリサイズ・移動してから閉じ、再起動後に状態が復元されることを確認する
- [ ] 3.2 `userData/window-state.json` を削除した状態で起動し、デフォルトサイズで起動することを確認する
- [ ] 3.3 `window-state.json` に不正な JSON を書き込んだ状態で起動し、デフォルト値にフォールバックしアプリが正常起動することを確認する