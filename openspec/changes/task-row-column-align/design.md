## Context

`TaskItem.tsx` では現在 `marginLeft: depth * 20`（`task-indent-compact` 適用後は `depth * 12`）で `.task-item` ラッパーをずらしてインデントを表現している。`.task-row` は `display: flex` で横並びになっており、各要素の幅は内容依存のため列が揃わない。

## Goals / Non-Goals

**Goals:**
- 全タスクのタスク名列・タグ列の水平位置を揃える
- ジャンルバッジ有無によるタスク名位置のずれをなくす
- インデントは引き続き階層ごとに適用する

**Non-Goals:**
- 縦の罫線によるツリー描画
- 発生日・期限日列の固定幅化（タスク行右端にあり問題になっていない）

## Decisions

### 1. インデント手法の変更

`.task-item` の `marginLeft` を廃止し、代わりに CSS カスタムプロパティ `--task-depth` を `.task-item` に設定する。`.task-row` のグリッド1列目にインデントスペーサーとして `calc(var(--task-depth, 1) * 12px)` を使う。

```tsx
// TaskItem.tsx
<div
  ref={setNodeRef}
  style={{ ...sortableStyle, '--task-depth': depth } as React.CSSProperties}
  className={`task-item task-item--depth-${depth}`}
>
```

サブタスク作成フォームも同様に `--task-depth` を使う（または `marginLeft` を据え置き）。

### 2. task-row の Grid レイアウト

```css
.task-row {
  display: grid;
  grid-template-columns:
    calc(var(--task-depth, 1) * 12px)  /* インデントスペーサー */
    24px                                /* ドラッグハンドル */
    20px                                /* 展開トグル */
    80px                                /* ジャンルスロット */
    1fr                                 /* タスク名+タグ */
    auto                                /* ステータス */
    auto;                               /* アクション（日付含む） */
  align-items: center;
  gap: 0 6px;
}
```

インデントスペーサーは `depth=1`（ルート）で 12px、`depth=2` で 24px になる。

### 3. ジャンルスロット

ジャンルバッジを `.task-genre-slot` ラッパーで囲む。ルートタスクかつジャンルありのときだけバッジを表示するが、スロット自体は常に Grid の1列を占める。

```tsx
<div className="task-genre-slot">
  {isRoot && task.genre && (
    <span className="task-genre" style={badgeStyle}>{task.genre}</span>
  )}
</div>
```

```css
.task-genre-slot {
  /* Grid列が固定幅なので何も指定しなくてよい */
  display: flex;
  align-items: center;
}
```

### 4. タスク名+タグエリア

タスク名とタグを `.task-main` ラッパーで囲み、横並びの flex コンテナにする。

```tsx
<div className="task-main">
  <span className="task-title">{task.title}</span>
  {task.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
</div>
```

```css
.task-main {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  min-width: 0;
}
.task-title {
  flex-shrink: 0;  /* flex: 1 から変更して自然な幅に */
  /* overflow hidden は .task-main 側で制御 */
}
```

### 5. ドラッグハンドル・展開トグルの配置

Grid 子要素としてそれぞれ1列を占めるよう配置する。`expand-toggle-placeholder` は引き続き同幅の空要素として使う。

### 6. インデントスペーサー要素

Grid の最初の列を埋めるための空要素を追加する。

```tsx
<div className="task-row" ...>
  <span className="task-indent-spacer" />  {/* Grid列1: インデント */}
  <button className="drag-handle" ...>⠿</button>  {/* Grid列2 */}
  ...
</div>
```

## ファイル変更一覧

| ファイル | 変更内容 |
|---|---|
| `src/renderer/src/components/TaskItem.tsx` | `marginLeft` → CSS変数、インデントスペーサー要素追加、ジャンルスロットラッパー追加、`task-main` ラッパー追加 |
| `src/renderer/src/index.css` | `.task-row` を Grid に変更、`.task-genre-slot`・`.task-main`・`.task-indent-spacer` スタイル追加 |

## Risks / Trade-offs

- [Grid 子要素数の固定] Grid 列数が固定なので、将来列を追加するときにスタイルの変更が必要になる。
- [サブタスクフォームの配置] サブタスク追加フォームは `.task-row` の外にあるため、別途 `marginLeft` か CSS変数でインデントを合わせる必要がある。
