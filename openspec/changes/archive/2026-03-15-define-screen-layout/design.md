## Context

現在の App.tsx はカウンターのみのスケルトン状態。画面構成を実装するにあたって、ルーティング・データモデル・コンポーネント構成の技術的な方針を決める必要がある。

## Goals / Non-Goals

**Goals:**
- Home 画面とプロジェクト画面の 2 種類の画面構成を実装する
- プロジェクトは複数作成でき、それぞれ専用の画面を持つ
- Project・Task のデータモデル（型定義）を確立する

**Non-Goals:**
- キーボードショートカットによるナビゲーション（将来の Change で対応）
- データの永続化（ローカルストレージ・ファイル保存）は別 Change で対応
- 認証・マルチユーザー対応

## Decisions

### 1. ルーティング: React Router を使わず useState で画面切り替え

アクティブな画面を `{ screen: 'home' } | { screen: 'project', projectId: string }` の形で `useState` 管理する。

**理由:** Electron アプリはブラウザの URL ナビゲーションを使わない。画面数が少ない初期段階では `useState` で十分シンプルに実現できる。将来的に画面が増えた時点で react-router への移行を検討する。

### 2. データモデル: `src/renderer/src/types.ts` に集約

```ts
type Project = {
  id: string
  name: string
  createdAt: string
}

type Task = {
  id: string
  projectId: string
  title: string
  done: boolean
  createdAt: string
}
```

**理由:** 永続化方式が未確定のため、型だけ定義してデータは `useState` でインメモリ管理（この Change のスコープ内）。

### 3. コンポーネント構成

```
App.tsx                    # 画面状態管理・ルートコンポーネント
screens/
  HomeScreen.tsx           # プロジェクト一覧・プロジェクト追加・タスク追加
  ProjectScreen.tsx        # プロジェクトのタスク一覧（projectId を props で受け取る）
```

## Risks / Trade-offs

- [インメモリ管理のためアプリ再起動でデータが消える] → この Change は UI 構成のスコープ。永続化は次の Change で対応することを明示する

## Open Questions

- プロジェクト削除・タスク削除はこの Change に含めるか？ → 含めない。CRUD の完全対応は別 Change で定義する