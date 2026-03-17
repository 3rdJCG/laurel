## 1. データモデルの更新

- [x] 1.1 `src/renderer/src/types.ts` に `Genre = { name: string; color: string }` 型を追加する
- [x] 1.2 `src/main/storage/settings.ts` に `Genre` 型を追加し、`AppSettings.genres` を `Genre[]` に変更する
- [x] 1.3 `src/main/storage/settings.ts` の `getSettings()` に `string[]` → `Genre[]` マイグレーション処理を追加する（既存データの `string` 要素には `color: '#6b7280'` を付与）

## 2. SettingsScreen の更新

- [x] 2.1 `SettingsScreen.tsx` の `AppSettings` 型定義を `genres: Genre[]` に更新し、`Genre` を `../types` から import する
- [x] 2.2 `genres` ステートを `Genre[]` に変更し、`handleAddGenre` でデフォルト色 `#6b7280` を付与するよう修正する
- [x] 2.3 `handleDeleteGenre` の引数を `genre: string`（ジャンル名）から `name: string` に変更し、`Genre[]` を操作するよう修正する
- [x] 2.4 `getTaskCountForGenre` の引数を `genre: string`（ジャンル名）に統一し、`t.genre === name` で比較するよう修正する
- [x] 2.5 ジャンル一覧の各行に色スウォッチボタン（`<button className="genre-color-swatch">`）を追加し、クリックでその行の色ピッカーを開閉する
- [x] 2.6 色ピッカーコンポーネント（インライン表示）を実装する：12色パレットのスウォッチグリッドと `#` プレフィックス付き hex 入力フィールドを含む
- [x] 2.7 パレットスウォッチ選択・有効な hex 入力（6桁）で即時に色を更新し `saveSettingsNow` を呼び出す

## 3. スタイルの追加

- [x] 3.1 `src/renderer/src/index.css` に `.genre-color-swatch` スタイルを追加する（丸いカラーボタン、`width/height: 20px`、`border-radius: 50%`）
- [x] 3.2 `.genre-color-picker` のスタイルを追加する（インラインブロック、パレットグリッド、hex 入力行のレイアウト）
- [x] 3.3 `.genre-color-palette` のスウォッチスタイルを追加する（`24px` 正方形、ホバー・選択時のアウトライン）

## 4. 動作確認

- [x] 4.1 `npm run typecheck` でエラーがないことを確認する
- [x] 4.2 設定画面のジャンル一覧で各ジャンルに色スウォッチが表示されることを確認する
- [x] 4.3 色スウォッチをクリックするとパレット + hex 入力の色ピッカーが展開し、他のジャンルのスウォッチをクリックすると前のピッカーが閉じることを確認する
- [x] 4.4 パレットから色を選択すると即時に反映・保存され、アプリ再起動後も維持されることを確認する
- [x] 4.5 hex 入力欄に有効な6桁 hex（例: `3b82f6`）を入力すると色が反映・保存されることを確認する
- [x] 4.6 既存の settings.json（`genres: string[]` 形式）を持つ状態でアプリを起動し、デフォルト色が付与されて正常に読み込まれることを確認する
- [x] 4.7 新規ジャンル追加時にデフォルト色（`#6b7280`）が設定されることを確認する
