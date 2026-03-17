## 1. task-item のインデント変更

- [x] 1.1 `TaskItem.tsx` の `.task-item` ラッパーの `style` を `marginLeft: depth * 20` から `'--task-depth': depth` の CSS変数渡しに変更する
- [x] 1.2 サブタスクフォーム（`.subtask-form`）の `style={{ marginLeft: 20 }}` を `style={{ marginLeft: depth * 12 + 12 }}` に変更し、親タスクと同じ深さ+1相当のインデントを維持する

## 2. task-row の Grid レイアウト化

- [x] 2.1 `index.css` の `.task-row` を `display: grid` に変更し、`grid-template-columns: calc(var(--task-depth, 1) * 12px) 24px 20px 80px 1fr auto auto` を設定する
- [x] 2.2 `TaskItem.tsx` の `.task-row` の先頭に `<span className="task-indent-spacer" />` を追加する（Grid 列1のスペーサー）
- [x] 2.3 `index.css` に `.task-indent-spacer { display: block; }` を追加する

## 3. ジャンルスロットの追加

- [x] 3.1 `TaskItem.tsx` のジャンルバッジを `<div className="task-genre-slot">` で囲む（バッジがないときも空のスロットとして列を占有させる）
- [x] 3.2 `index.css` に `.task-genre-slot { display: flex; align-items: center; min-width: 0; }` を追加する

## 4. タスク名+タグエリアのラッパー追加

- [x] 4.1 `TaskItem.tsx` のタスク名 `<span className="task-title">` とタグ `<span className="tag">` を `<div className="task-main">` で囲む
- [x] 4.2 `index.css` に `.task-main { display: flex; align-items: center; gap: 6px; overflow: hidden; min-width: 0; }` を追加する
- [x] 4.3 `index.css` の `.task-title` から `flex: 1` を削除し（`task-main` が Grid の `1fr` 列を占めるため不要）、`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` を残す

## 5. ステータスとアクションの Grid 対応確認

- [x] 5.1 `.status-wrapper` と `.task-actions` の `flex-shrink: 0` が設定されていることを確認し、必要に応じて追加する

## 6. 動作確認

- [x] 6.1 `npm run typecheck` でエラーがないことを確認する（既存の `findRootTask` 未使用エラーのみ、今回の変更に起因するエラーなし）
- [x] 6.2 ルートタスク・サブタスク・サブサブタスクでタスク名列の左端が揃って見えることを確認する
- [x] 6.3 ジャンルありルートタスクとなしルートタスクでタスク名位置が同じことを確認する
- [x] 6.4 ドラッグ＆ドロップが正常に機能することを確認する
