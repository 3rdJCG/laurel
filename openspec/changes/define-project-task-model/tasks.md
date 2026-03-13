## 1. 依存ライブラリの追加

- [ ] 1.1 `npm install ulid` で ulid ライブラリを追加する
- [ ] 1.2 `npm install --save-dev @types/ulid` が必要か確認し、必要であれば追加する（ulid は型定義同梱のため不要な場合あり）

## 2. 型定義の実装

- [ ] 2.1 `src/renderer/src/types.ts` を新規作成する
- [ ] 2.2 `TaskStatus` 型（`'todo' | 'in-progress' | 'in-review' | 'done'`）を定義する
- [ ] 2.3 `Project` 型（`id`, `name`, `createdAt`）を定義する
- [ ] 2.4 `Task` 型（`id`, `projectId`, `parentId`, `title`, `status`, `genre`, `tags`, `createdAt`）を定義する

## 3. 動作確認

- [ ] 3.1 `npm run typecheck` で型エラーがないことを確認する