## Context

`define-screen-layout` の design.md で Project・Task の型を暫定スケッチとして定義した。この Change でそれを正式な型定義として確定させる。永続化はまだ別 Change のスコープのため、ここでは TypeScript の型のみを定義する。

## Goals / Non-Goals

**Goals:**
- 時系列ソートが保証される ID 方式を決定する
- Task の親子階層構造（最大5層）を型で表現する
- Task のステータス（TaskStatus）を定義し、将来の追加に対応できる拡張可能な設計にする
- Task のジャンル・タグを定義し、親からの継承ルールを明文化する
- `Project` 名・`Task` 名が任意に設定できることを保証する
- `src/renderer/src/types.ts` に実装する

**Non-Goals:**
- データの永続化・シリアライズ形式（別 Change）
- 5層を超える階層（将来実装として留保）
- ジャンル・タグのマスタ管理 UI（別 Change）

## Decisions

### 1. ID 戦略: ULID を採用（時系列ソート保証）

`crypto.randomUUID()` は時系列ソート不可のため不採用。**ULID**（Universally Unique Lexicographically Sortable Identifier）を採用する。

- ULID は 48bit のタイムスタンプ + 80bit のランダム値で構成される26文字の文字列
- 辞書順ソート（文字列比較）で時系列順になる
- ライブラリ: `ulid`（`npm install ulid`）

```ts
import { ulid } from 'ulid'
const id = ulid() // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

**代替案:**
- `Date.now() + '-' + Math.random()` — ランダム部分の衝突リスクがある
- `crypto.randomUUID()` + `createdAt` でソート — ID 自体のソートは不可、クエリが2フィールド必要になる

### 2. エンティティの型定義

```ts
// タスクのステータス。将来の追加はここに union を追加するだけでよい
type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'done'

// Project: タスクをグループ化する単位
type Project = {
  id: string        // ULID（時系列ソート可）
  name: string      // ユーザーが任意に設定するプロジェクト名
  createdAt: string // ISO 8601 文字列
}

// Task: 作業の最小単位。親子で最大5層の階層を持てる
type Task = {
  id: string               // ULID（時系列ソート可）
  projectId: string        // 所属プロジェクトの id（必須）
  parentId: string | null  // 親タスクの id。null = ルートタスク（第1層）
  title: string            // ユーザーが任意に設定するタスク名
  status: TaskStatus       // 初期値: 'todo'
  genre: string | null     // ジャンル/カテゴリ（任意）
  tags: string[]           // タグ一覧（任意、複数可）
  createdAt: string        // ISO 8601 文字列
}
```

**TaskStatus の拡張方針:**
- 新しいステータスを追加する場合は `TaskStatus` union に追加するだけでよい
- ステータスの表示ラベル・色などの UI マッピングは別ファイル（定数ファイル）で管理し、型定義とは分離する

### 3. 階層構造: `parentId` による隣接リスト方式

ツリー構造を `parentId` の参照で表現する（隣接リスト）。

- `parentId: null` = 第1層（ルートタスク）
- `parentId: <taskId>` = 子タスク
- 最大5層は**アプリケーション層で制御**する（型では表現しない）。6層目以降の追加を試みた場合は UI でブロックする
- 5層を超える深い階層は将来実装として留保

**代替案:** ネスト型（`children: Task[]`）— インメモリでは扱いやすいが、永続化・検索が複雑になるため不採用

### 4. ジャンル・タグの親継承

**ルール:** 親タスクのジャンル・タグは「任意継承」とする。子タスク作成時にデフォルト値として親の値を引き継ぐが、子タスク側で上書き可能。

- 継承はアプリケーション層のロジックで実装（型では表現しない）
- 子タスク作成時に `genre`・`tags` を親からコピーして初期値とする
- 子タスク側で `genre`・`tags` を変更しても親には影響しない

### 5. 型エイリアス（`type`）を使用

単純なデータ構造のため `interface` の継承・宣言マージは不要。`type` で統一する。

## Risks / Trade-offs

- [ULID ライブラリの依存追加が必要] → `ulid` は軽量（gzipped ~1KB）で副作用なし
- [階層の深さチェックがアプリ層の責務になる] → 型で表現できないが、タスク追加時に depth を計算してガードする
- [TaskStatus の union 拡張時に既存データとの整合性] → 永続化 Change で移行戦略を定義する。追加のみで削除しない運用にすることでリスクを最小化する
- [`define-screen-layout` の暫定型（`done: boolean`）と乖離] → この Change 確定後に screen-layout 実装タスクで正式型を使用するよう統一する