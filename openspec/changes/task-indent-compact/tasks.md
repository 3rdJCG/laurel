## 1. インデント幅の縮小

- [ ] 1.1 `TaskItem.tsx` の `marginLeft: depth * 20` を `marginLeft: depth * 12` に変更する
- [ ] 1.2 `TaskItem.tsx` のサブタスクフォームの `marginLeft: 20` を `marginLeft: 12` に変更する

## 2. ∟ 記号の追加

- [ ] 2.1 `TaskItem.tsx` のタスク行（`.task-row`）内、ドラッグハンドルの前に `depth > 1` のとき `<span className="task-indent-marker">∟</span>` を追加する
- [ ] 2.2 `index.css` に `.task-indent-marker` スタイルを追加する（`color: #555; font-size: 13px; flex-shrink: 0; user-select: none;`）

## 3. 動作確認

- [ ] 3.1 `npm run typecheck` でエラーがないことを確認する
- [ ] 3.2 ルートタスクに `∟` が表示されないことを確認する
- [ ] 3.3 サブタスク・サブサブタスクに `∟` が表示され、インデントがコンパクトになっていることを確認する
