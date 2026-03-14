## 1. SettingsScreen コンポーネントへのリネームと改修

- [x] 1.1 `src/renderer/src/screens/SettingsScreen.tsx` を新規作成し、`SettingsModal.tsx` の実装をベースに移植する（モーダル用の `isOpen`・`onClose` props・オーバーレイ DOM を除去する）
- [x] 1.2 保存成功時の `onClose()` 呼び出しを削除し、代わりに成功メッセージをインライン表示する
- [x] 1.3 `src/renderer/src/components/SettingsModal.tsx` を削除する

## 2. View 型とナビゲーションの更新

- [x] 2.1 `src/renderer/src/components/Sidebar.tsx` の `View` 型に `{ type: 'settings' }` を追加する
- [x] 2.2 `Sidebar.tsx` の `Props` から `onSettingsOpen` を削除し、Settings ボタンのクリックを `onNavigate({ type: 'settings' })` に変更する
- [x] 2.3 `isActive` 関数に `settings` ビューの判定を追加してサイドバーのアクティブ状態を反映する

## 3. App.tsx の更新

- [x] 3.1 `App.tsx` から `isSettingsOpen` / `setIsSettingsOpen` 状態を削除する
- [x] 3.2 `App.tsx` の `renderMain` に `settings` ケースを追加して `SettingsScreen` を返す
- [x] 3.3 `App.tsx` の `<Sidebar>` から `onSettingsOpen` prop を削除する
- [x] 3.4 `App.tsx` から `SettingsModal` の import と JSX を削除する

## 4. 動作確認

- [x] 4.1 サイドバーの Settings をクリックして設定画面がメインエリアに表示され、現在の保存先が表示されることを確認する
- [x] 4.2 設定画面表示中、サイドバーの Settings 項目がアクティブ状態になることを確認する
- [x] 4.3 「フォルダを選択」で OS ダイアログが開き、選択したパスがフィールドに反映されることを確認する
- [x] 4.4 UNC パスをテキストフィールドに手入力して保存できることを確認する
- [x] 4.5 存在しない/アクセス不可のパスを指定したときにエラーメッセージが表示されることを確認する
- [x] 4.6 キャンセルボタンで変更が破棄され、フィールドが元のパスに戻ることを確認する
- [x] 4.7 `npm run typecheck` でエラーがないことを確認する
