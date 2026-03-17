## Context

Laurel は Electron アプリ（React + TypeScript）。設定画面（`SettingsScreen.tsx`）がフルページビューとして実装済みで、ジャンルを `string[]` で管理している。設定の永続化は `src/main/storage/settings.ts` が担当し、`AppSettings.genres` を `string[]` として JSON に保存している。

## Goals / Non-Goals

**Goals:**
- ジャンルに色（hex カラー）を関連付けて保存・表示できるようにする
- 設定画面のジャンル管理 UI でジャンルごとに色を変更できるようにする
- プリセットカラーパレット（12色）から選択 + hex コード手入力に対応する
- 既存データ（`genres: string[]`）を自動マイグレーションしデフォルト色を付与する

**Non-Goals:**
- タスク一覧でジャンル色を表示する（別 change で対応）
- ジャンルの並び替え
- カスタムパレットの編集・保存

## Decisions

### 1. Genre 型の定義

`string` から `{ name: string; color: string }` に変更する。`color` は常に `#rrggbb` 形式の hex 文字列。

```ts
// src/renderer/src/types.ts に追加
export type Genre = {
  name: string
  color: string  // 例: "#ef4444"
}

// src/main/storage/settings.ts にも同様の型を追加
export type Genre = {
  name: string
  color: string
}

export type AppSettings = {
  dataDir: string
  genres: Genre[]
}
```

`Task.genre: string | null` はジャンル名（`Genre.name`）への参照のままとし、型変更なし。

### 2. 既存データのマイグレーション

`getSettings()` 読み込み時に `genres` 配列の要素が `string` だった場合、デフォルト色（`#6b7280`）を付与した `Genre` オブジェクトに変換する。

```ts
genres: (parsed.genres ?? []).map((g) =>
  typeof g === 'string' ? { name: g, color: DEFAULT_COLOR } : g
)
```

### 3. 色ピッカー UI

ジャンル一覧の各行に色スウォッチボタンを表示し、クリックするとインラインで色ピッカーが展開する。

```
[ ● ] ジャンル名                              [ 🗑️ ]
      ┌─────────────────────────────────────┐
      │ ● ● ● ● ● ● ● ● ● ● ● ●  （12色）  │
      │ # [______] ← hex 入力               │
      └─────────────────────────────────────┘
```

- スウォッチ選択・hex 入力（有効な6桁 hex）で即時反映し、自動保存する
- 開いているピッカーは他のジャンルのスウォッチをクリックすると閉じる
- 1度に1ジャンル分のピッカーのみ表示する

### 4. プリセットパレット（12色）

```ts
const PALETTE = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#6b7280', // Gray  ← デフォルト色
  '#475569', // Slate
]
```

### 5. デフォルト色

新規ジャンル追加時は `#6b7280`（Gray）を自動割り当てする。

### 6. hex 入力のバリデーション

入力欄は `#` プレフィックスを固定表示し、6桁の hex 文字のみ受け付ける。`/^[0-9a-fA-F]{6}$/` にマッチしたとき色を更新・保存する。不正な入力はエラー表示せず無視する。

## ファイル変更一覧

| ファイル | 変更内容 |
|---|---|
| `src/main/storage/settings.ts` | `Genre` 型追加、`AppSettings.genres` を `Genre[]` に変更、マイグレーション処理追加 |
| `src/renderer/src/types.ts` | `Genre` 型追加 |
| `src/renderer/src/screens/SettingsScreen.tsx` | ジャンル管理 UI に色スウォッチ・色ピッカーを追加、`Genre` 型に対応 |
| `src/renderer/src/index.css` | 色ピッカー・スウォッチのスタイル追加 |

## Risks / Trade-offs

- [Task.genre の参照] ジャンルをリネームした場合、タスクの `genre` フィールドが古い名前を指したままになる。本 change ではリネーム機能を対象外とし、既存の削除のみ対応する。
- [色ピッカーライブラリ不使用] 外部依存を避けるため、ネイティブの `<input type="color">` は使わず自前実装とする。ただし機能は最小限（パレット + hex 入力）にとどめる。
