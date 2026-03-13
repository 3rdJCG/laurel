## 1. データ管理層のセットアップ

- [ ] 1.1 `src/renderer/src/` に `DataProvider.tsx` を作成し、`isLoading` / `error` / `projects` 状態を管理する Context を定義する
- [ ] 1.2 `DataProvider` の `useEffect([], [])` で `window.api.invoke('data:load-all')` を呼び、取得データを状態に格納する
- [ ] 1.3 `App.tsx` に `DataProvider` を組み込み、ローディング中は `<LoadingScreen />`、エラー時は `<ErrorScreen />` を表示するよう分岐を追加する

## 2. ローディング・エラー画面コンポーネント

- [ ] 2.1 `src/renderer/src/components/LoadingScreen.tsx` を作成し、ローディングインジケーターを表示する
- [ ] 2.2 `src/renderer/src/components/ErrorScreen.tsx` を作成し、エラーメッセージを表示する

## 3. プロジェクト作成 UI の実装

- [ ] 3.1 `src/renderer/src/components/ProjectInlineForm.tsx` を作成し、プロジェクト名入力フォームを実装する（Enter で確定・Escape でキャンセル・空文字は無効）
- [ ] 3.2 Home 画面コンポーネントにプロジェクト一覧末尾の「＋ プロジェクトを追加」ボタンを追加し、押下で `ProjectInlineForm` を展開する
- [ ] 3.3 フォーム確定時に `window.api.invoke('data:save-project', newProject)` を呼び、作成プロジェクトを状態に追加する

## 4. Home 画面のタスク追加 UI の削除

- [ ] 4.1 Home 画面コンポーネントにタスク追加 UI（入力フォーム・プロジェクト選択など）が実装されている場合は削除する