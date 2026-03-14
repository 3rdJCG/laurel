## 1. App.tsx のナビゲーション状態管理を整備

- [x] 1.1 `currentView` state の型（`{ type: 'home' } | { type: 'project'; projectId: string }`）を定義する
- [x] 1.2 `isSettingsOpen` / `isAboutOpen` state を `App.tsx` に追加する
- [x] 1.3 プロジェクト画面の「Home へ戻る」ボタンを削除し、サイドバー経由の遷移に一本化する

## 2. サイドバーコンポーネントの実装

- [x] 2.1 `Sidebar` コンポーネントを作成する（props: `currentView`, `projects`, `onNavigate`, `onSettingsOpen`, `onAboutOpen`, `collapsed`, `onToggleCollapse`）
- [x] 2.2 ハンバーガーボタンを実装し、クリックで `collapsed` を toggle する
- [x] 2.3 展開時（アイコン + ラベル）・折りたたみ時（アイコンのみ）の表示を CSS transitions で切り替える
- [x] 2.4 Home 項目を実装する（アイコン + ラベル「Home」、アクティブ状態スタイル）
- [x] 2.5 プロジェクト一覧を ULID 順で表示する項目を実装する（アクティブ状態スタイル含む）
- [x] 2.6 プロジェクト一覧が縦スクロールできるようにする
- [x] 2.7 下部固定の Settings ボタンを実装する（クリックで `onSettingsOpen` 呼び出し）
- [x] 2.8 下部固定の About ボタンを実装する（クリックで `onAboutOpen` 呼び出し）

## 3. 折りたたみ状態の永続化

- [x] 3.1 `localStorage` から初期折りたたみ状態を読み込む処理を実装する
- [x] 3.2 折りたたみ状態変更時に `localStorage` へ書き込む処理を実装する

## 4. App.tsx への統合

- [x] 4.1 `App.tsx` のレイアウトを「サイドバー + メインコンテンツ」の横並びに変更する
- [x] 4.2 `currentView` に応じて Home 画面またはプロジェクト画面を表示するスイッチ処理を実装する
- [x] 4.3 `Sidebar` の `onNavigate` コールバックで `currentView` を更新する処理を実装する
- [x] 4.4 Settings モーダル・About モーダルを `App.tsx` レベルで管理し、サイドバーのボタンから開閉できるようにする

## 5. 動作確認

- [ ] 5.1 サイドバーの Home・各プロジェクト・Settings・About へのナビゲーションが動作することを確認する
- [ ] 5.2 ハンバーガーボタンで展開・折りたたみが切り替わり、再起動後に状態が復元されることを確認する
- [ ] 5.3 アクティブ状態のハイライトが現在の画面に正しく追従することを確認する
