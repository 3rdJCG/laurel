## Why

`settings-screen-ui` change で実装された設定画面はモーダルダイアログとして表示されるが、Home や Project と同じ専用ビューとして表示する方が一貫性のある UX になる。設定項目が増えた場合にも対応しやすく、サイドバーでのナビゲーション体験も統一できる。

## What Changes

- `SettingsModal` コンポーネントをモーダルから専用画面（`SettingsScreen`）に変更する
- `View` 型に `settings` を追加し、サイドバーから設定画面へ遷移できるようにする
- `App.tsx` の `isSettingsOpen` 状態管理をビュー管理（`currentView`）に統合する
- `Sidebar.tsx` の Settings ボタンを `onSettingsOpen` コールバックではなく `onNavigate` 経由に変更する

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `settings-screen`: モーダル表示から専用フルビュー表示に変更

## Impact

- `src/renderer/src/components/SettingsModal.tsx` → `src/renderer/src/screens/SettingsScreen.tsx` にリネーム・改修
- `src/renderer/src/components/Sidebar.tsx` の `View` 型に `{ type: 'settings' }` を追加
- `src/renderer/src/App.tsx` から `isSettingsOpen` 状態を削除し `renderMain` に `settings` ケースを追加
