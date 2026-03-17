## 1. App.tsx の離脱ガード対応

- [x] 1.1 `AppContent` に `settingsIsDirtyRef = useRef<() => boolean>(() => false)` を追加する
- [x] 1.2 `setCurrentView` の直接呼び出しを `handleNavigate(view: View): void` 関数でラップし、`currentView.type === 'settings'` かつ `settingsIsDirtyRef.current()` が true のとき `window.confirm` を表示してキャンセル時はナビゲートしないようにする
- [x] 1.3 `Sidebar` の `onNavigate` を `handleNavigate` に差し替える
- [x] 1.4 `SettingsScreen` に `registerDirtyChecker={(fn) => { settingsIsDirtyRef.current = fn }}` を渡すよう変更する

## 2. SettingsScreen.tsx のタブ構成への書き換え

- [x] 2.1 `type SettingsTab = 'storage' | 'user' | 'categories'` を定義し、`activeTab` state を追加する
- [x] 2.2 `Props` 型に `registerDirtyChecker: (fn: () => boolean) => void` を追加し、コンポーネント引数で受け取る
- [x] 2.3 saved 値用 state（`savedDataDir`, `savedName`, `savedMail`, `savedGenres`）と draft 値用 state（`draftDataDir`, `draftName`, `draftMail`, `draftGenres`）に分割する
- [x] 2.4 `loadSettings()` を変更し、取得した値を saved 変数と draft 変数の両方にセットするようにする（`setSavedDataDir(v); setDraftDataDir(v)` など）
- [x] 2.5 `isDirty` フラグを各タブ用に算出する (`storageIsDirty`, `userIsDirty`, `categoriesIsDirty`)
- [x] 2.6 `useEffect` で `registerDirtyChecker(() => storageIsDirty || userIsDirty || categoriesIsDirty)` を登録する（依存配列に3つのdirtyフラグを含める）

## 3. タブ切り替えガードの実装

- [x] 3.1 `handleTabChange(next: SettingsTab): void` 関数を実装する: アクティブタブが dirty な場合 `window.confirm` を表示し、確認されたら draft を discard（`loadSettings()` 相当のリセット）してタブを切り替える
- [x] 3.2 各タブボタンの `onClick` を `handleTabChange` に変更する

## 4. 保存・破棄ボタンの実装

- [x] 4.1 `handleStorageSave()`: `draftDataDir` を `saveDataDir()` で保存し、成功時に `setSavedDataDir(draftDataDir)` を呼ぶ
- [x] 4.2 `handleUserSave()`: `draftName` / `draftMail` を `saveUserInfo()` で保存し、成功時に `setSavedName` / `setSavedMail` を更新する
- [x] 4.3 `handleCategoriesSave()`: `draftGenres` を `settings:genres-set` IPC で保存し、成功時に `setSavedGenres(draftGenres)` を呼ぶ
- [x] 4.4 `handleDiscard(tab: SettingsTab)`: 対象タブの draft state を saved state の値にリセットする
- [x] 4.5 既存のジャンル操作（`handleAddGenre`, `handleDeleteGenre`, `handleColorChange`）を draft 更新のみ（IPC呼び出しなし）に変更する

## 5. JSX の書き換え

- [x] 5.1 `repo-tabs` タブバーを3タブで描画する（ラベル: データ保存先 / ユーザー情報 / カテゴリ管理）
- [x] 5.2 各タブコンテンツを `activeTab` に応じて条件分岐で描画する
- [x] 5.3 各タブコンテンツの下部に `settings-tab-footer` div（保存ボタン・破棄ボタン・エラー/成功メッセージ）を配置する
- [x] 5.4 カテゴリ管理タブにタグ管理プレースホルダー（「タグ管理は近日追加予定」テキスト）を追加する
- [x] 5.5 既存の画面下部の `settings-footer` div と単一の「変更を保存」ボタンを削除する

## 6. index.css のスタイル追加

- [x] 6.1 `.settings-tab-footer` スタイルを追加する（flex, gap, padding, 上ボーダーで区切り線）

## 7. 動作確認

- [x] 7.1 `npm run typecheck` でエラーがないことを確認する
- [x] 7.2 3タブが正しく切り替わることを確認する
- [x] 7.3 各タブで変更後に保存ボタンが有効化され、保存後に無効化されることを確認する
- [x] 7.4 タブ切り替え時に未保存変更がある場合、確認ダイアログが表示されることを確認する
- [x] 7.5 サイドバーで別画面に遷移しようとしたとき、未保存変更がある場合に確認ダイアログが表示されることを確認する
- [x] 7.6 確認ダイアログで「キャンセル」を選んだとき、画面/タブが移動しないことを確認する
