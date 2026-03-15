## 1. データモデルの更新

- [x] 1.1 `src/renderer/src/types.ts` の `Task` 型に `occurredAt: string | null` と `dueAt: string | null` を追加する
- [x] 1.2 `src/renderer/src/context/DataContext.tsx` の `createTask` で `occurredAt` のデフォルト値を `new Date().toISOString().slice(0, 10)` に設定し、`dueAt` は `null` で初期化する

## 2. ジャンルバッジのカラー表示

- [x] 2.1 `TaskItem.tsx` の `useData()` から `genres` を取得する（すでに取得済みの場合はスキップ）
- [x] 2.2 ジャンルバッジのレンダリング部分で `genres.find((g) => g.name === displayGenre)` でカラーを取得し、`style={{ backgroundColor: genreObj?.color, color: '#fff' }}` を適用する
- [x] 2.3 `index.css` の `.task-genre` スタイルに `border-radius: 4px; padding: 1px 6px; font-size: 12px; font-weight: 500;` を設定して色付きバッジとして自然に見えるようにする

## 3. 展開状態の永続化

- [x] 3.1 `ProjectScreen.tsx` の `expandedIds` の初期値を `localStorage.getItem('laurel:expand:${projectId}')` から復元するよう変更する（`useState` の初期化関数で行う）
- [x] 3.2 `handleToggleExpand` で状態を更新した後、`localStorage.setItem('laurel:expand:${projectId}', JSON.stringify([...next]))` を呼び出す
- [x] 3.3 `projectId` が変わったときの `useEffect` で `localStorage` から該当プロジェクトの展開状態を読み込んで `setExpandedIds` する

## 4. 発生日・期限日の表示

- [x] 4.1 `TaskItem.tsx` の非編集時タスク行に発生日（`task.occurredAt`）と期限日（`task.dueAt`）を表示する。どちらも `null` の場合は非表示とする
- [x] 4.2 期限日が今日より前の場合に `.task-date--overdue` クラスを付与する
- [x] 4.3 `index.css` に `.task-date`（日付表示の共通スタイル）と `.task-date--overdue`（赤字）スタイルを追加する

## 5. 発生日・期限日の編集

- [x] 5.1 `TaskItem.tsx` の編集ステートに `editOccurredAt: string` と `editDueAt: string` を追加し、`isEditing` になったとき `task.occurredAt ?? ''` と `task.dueAt ?? ''` で初期化する
- [x] 5.2 編集フォームに発生日（`<input type="date">`）と期限日（`<input type="date">`）を追加する
- [x] 5.3 `handleEditConfirm` で `occurredAt: editOccurredAt || null` と `dueAt: editDueAt || null` を `updateTask` に含める

## 6. 編集フォームのレイアウト改善

- [x] 6.1 `index.css` の `.task-edit-form` に `display: flex; flex-direction: column; gap: 8px;` を設定する
- [x] 6.2 ジャンル選択（`GenrePicker`）とタグ入力エリア（`.tag-editor`）を `.task-edit-row` ラッパーで囲み `display: flex; gap: 8px; align-items: flex-start;` で横並びにする。タグエリアに `flex: 1` を付与する
- [x] 6.3 発生日と期限日の `<input type="date">` を `.task-edit-row` ラッパーで横並びにする
- [x] 6.4 確定ボタン（`.btn-confirm`）と キャンセルボタン（`.btn-cancel`）を `.task-edit-actions` ラッパーで囲み横並びにする
- [x] 6.5 `index.css` に `.task-edit-row`、`.task-edit-actions`、`.btn-confirm`（青背景 `#3b82f6`）、`.btn-cancel`（グレー背景 `#6b7280`）のスタイルを追加する

## 7. 動作確認

- [x] 7.1 `npm run typecheck` でエラーがないことを確認する
- [ ] 7.2 ジャンルに色を設定済みのタスクのバッジが設定色で表示されることを確認する
- [ ] 7.3 タスクを展開してプロジェクト画面を離れ戻ったとき、展開状態が維持されることを確認する
- [ ] 7.4 アプリを再起動しても展開状態が維持されることを確認する
- [ ] 7.5 新規タスク追加時に発生日が当日の日付で設定されることを確認する
- [ ] 7.6 タスク編集フォームで発生日・期限日を変更して保存し、正しく反映されることを確認する
- [ ] 7.7 編集フォームでジャンル選択とタグが横並びになっていることを確認する
- [ ] 7.8 確定ボタンが青、キャンセルボタンがグレーで表示されることを確認する
