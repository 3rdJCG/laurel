## 1. データモデルの拡張

- [ ] 1.1 `src/renderer/src/types.ts` に `Comment` 型を追加する（`id`, `taskId`, `parentId`, `authorName`, `authorEmail`, `body`, `createdAt`）
- [ ] 1.2 `src/main/storage/settings.ts` の `AppSettings` 型に `name` / `mailAddress` フィールドを追加し、`getSettings` / `saveSettings` でデフォルト値（空文字）を扱えるようにする

## 2. バックエンド（Mainプロセス）の実装

- [ ] 2.1 `src/main/storage/projectStore.ts` のプロジェクトデータ読み書きに `comments` 配列を追加する（既存データとの互換性を保つ）
- [ ] 2.2 `comments:list` IPC ハンドラーを `src/main/index.ts` に追加する（`{ projectId, taskId }` → `Comment[]`）
- [ ] 2.3 `comments:add` IPC ハンドラーを `src/main/index.ts` に追加する（ULID で id・createdAt を付与して保存する）
- [ ] 2.4 `src/preload/index.ts` および `src/preload/index.d.ts` に `comments:list` / `comments:add` のチャンネルを追加する

## 3. View 型とナビゲーションの更新

- [ ] 3.1 `src/renderer/src/components/Sidebar.tsx` の `View` 型に `{ type: 'task'; projectId: string; taskId: string }` を追加する
- [ ] 3.2 `src/renderer/src/App.tsx` の `renderMain` に `task` ケースを追加して `TaskDetailScreen` を返す
- [ ] 3.3 `src/renderer/src/screens/ProjectScreen.tsx` の Props に `onNavigateToTask` を追加し、ルートタスクのタイトルをクリックで遷移できるようにする
- [ ] 3.4 `src/renderer/src/App.tsx` で `onNavigateToTask` を受けて `setCurrentView({ type: 'task', ... })` を呼ぶようにする

## 4. TaskDetailScreen の実装

- [ ] 4.1 `src/renderer/src/screens/TaskDetailScreen.tsx` を新規作成し、detail / conversation タブ切り替えを実装する（Props: `projectId`, `taskId`, `onNavigateBack`）
- [ ] 4.2 `src/renderer/src/components/TaskDetailTab.tsx` を新規作成する
  - ルートタスクとそのサブタスクをツリー表示する
  - ステータスをドロップダウンで変更できる
  - タスク名をクリックでインライン編集できる（Enter/blur で保存）
  - ジャンルを設定済みジャンルリストからドロップダウンで変更できる
  - タグをバッジ形式で表示し、追加・削除できる
- [ ] 4.3 `src/renderer/src/components/ConversationTab.tsx` を新規作成する
  - コメントをツリー状（ルート + 返信インデント）で時系列表示する
  - 投稿者の表示名を表示し、クリックでメールアドレスをトグル表示する
  - 新規コメント投稿フォームを下部に配置する
  - コメントに「返信」ボタンを付与し、クリックでインライン返信フォームを展開する

## 5. 設定画面の更新

- [ ] 5.1 `src/renderer/src/screens/SettingsScreen.tsx` にユーザー情報セクション（`name` / `mailAddress` の入力フォーム）を追加する
- [ ] 5.2 `handleSave` で `name` / `mailAddress` を含む設定を保存するよう更新する

## 6. DataContext の更新

- [ ] 6.1 `src/renderer/src/context/DataContext.tsx` に `comments` の取得・追加に関する関数（`listComments`, `addComment`）を追加する

## 7. 動作確認

- [ ] 7.1 ProjectScreen のルートタスクをクリックして TaskDetailScreen へ遷移し、タスク名・ジャンル・タグを編集して保存されることを確認する
- [ ] 7.2 detail タブでサブタスクのステータス変更がプロジェクト画面に反映されることを確認する
- [ ] 7.3 conversation タブでコメントを投稿し、ツリー状に表示されることを確認する
- [ ] 7.4 投稿者名をクリックするとメールアドレスが表示されることを確認する
- [ ] 7.5 設定画面で `name` / `mailAddress` を入力・保存し、次回コメント投稿時に反映されることを確認する
- [ ] 7.6 `npm run typecheck` でエラーがないことを確認する
