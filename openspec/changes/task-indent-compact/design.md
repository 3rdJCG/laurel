## Context

`TaskItem.tsx` では `marginLeft: depth * 20` のインラインスタイルで各 `task-item` をインデントしている。`depth` はルートタスクが `1`、その子が `2`、孫が `3` となる。

## Goals / Non-Goals

**Goals:**
- インデント幅を縮小してコンパクトな階層表示にする
- `∟` 記号でサブタスクの親子関係を明示する

**Non-Goals:**
- 縦の接続線（罫線）の描画
- アニメーション

## Decisions

### 1. インデント幅

`depth * 20` → `depth * 12` に変更する。サブタスクフォームの固定 `marginLeft: 20` も `12` に合わせる。

### 2. ∟ 記号

`depth > 1`（サブタスク以下）のとき、ドラッグハンドルの前に `<span className="task-indent-marker">∟</span>` を表示する。

```
[ ∟ ] [ ⠿ ] [ ▶ ] ジャンル タスク名 ...
```

### 3. スタイル

```css
.task-indent-marker {
  color: #555;
  font-size: 13px;
  flex-shrink: 0;
  user-select: none;
}
```

## ファイル変更一覧

| ファイル | 変更内容 |
|---|---|
| `src/renderer/src/components/TaskItem.tsx` | インデント幅を `12` に変更、`∟` マーカーを追加 |
| `src/renderer/src/index.css` | `.task-indent-marker` スタイルを追加 |
