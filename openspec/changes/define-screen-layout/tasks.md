## 1. データモデルの定義

- [ ] 1.1 `src/renderer/src/types.ts` を作成し `Project` 型・`Task` 型を定義する

## 2. 画面状態管理・ナビゲーション

- [ ] 2.1 `App.tsx` に画面状態（`{ screen: 'home' } | { screen: 'project', projectId: string }`）を `useState` で管理する実装を追加する
- [ ] 2.2 Home ↔ プロジェクト画面の遷移ロジックを `App.tsx` に実装する

## 3. Home 画面の実装

- [ ] 3.1 `src/renderer/src/screens/HomeScreen.tsx` を作成する
- [ ] 3.2 プロジェクト一覧の表示（プロジェクトが0件の場合のメッセージ含む）を実装する
- [ ] 3.3 プロジェクト追加フォーム（名前入力 + 追加ボタン）を実装する
- [ ] 3.4 タスク追加フォーム（タイトル入力 + プロジェクト選択 + 追加ボタン）を実装する
- [ ] 3.5 プロジェクトカードをクリックするとプロジェクト画面へ遷移する動作を実装する

## 4. プロジェクト画面の実装

- [ ] 4.1 `src/renderer/src/screens/ProjectScreen.tsx` を作成する（`projectId` を props で受け取る）
- [ ] 4.2 該当プロジェクトのタスク一覧表示（タスクが0件の場合のメッセージ含む）を実装する
- [ ] 4.3 Home 画面へ戻るナビゲーション要素を実装する

## 5. App.tsx への組み込みと動作確認

- [ ] 5.1 `App.tsx` で画面状態に応じて `HomeScreen` / `ProjectScreen` を切り替えて表示する
- [ ] 5.2 `npm run dev` で起動し、Home・プロジェクト画面の遷移が動作することを確認する
- [ ] 5.3 `npm run typecheck` で型エラーがないことを確認する