## Context

Laurel の React + Electron アプリ。タスク編集は `TaskItem.tsx` で行い、ジャンルは現在 `<input type="text">` で自由入力。登録済みジャンルは `settings:get` / `settings:genres-set` IPC で永続化されており、`DataContext` にはまだ公開されていない。

## Goals / Non-Goals

**Goals:**
- タスク編集フォームのジャンルを登録済みジャンルのみ選択できる UI に変更する
- タスク編集フォームからその場で新規ジャンルを追加できるようにする
- 追加された新規ジャンルは設定画面のジャンル一覧にも即時反映される

**Non-Goals:**
- タスク編集フォームでのジャンル色変更（色変更は設定画面のみ）
- 既存タスクのジャンルを一括置換・マイグレーションする機能
- ジャンルの並び替え

## Decisions

### 1. DataContext へのジャンル公開

`DataContext` に `genres: Genre[]` と `addGenre(name: string): Promise<void>` を追加する。

- 初期化時に `settings:get` でジャンル一覧を取得する
- `addGenre` は新規ジャンルを `settings:genres-set` で保存し `genres` を更新する

```ts
// DataContext.tsx に追加
const [genres, setGenres] = useState<Genre[]>([])

// 初期化
useEffect(() => {
  window.api.invoke('settings:get').then((s) => setGenres((s as AppSettings).genres ?? []))
}, [])

const addGenre = async (name: string): Promise<void> => {
  const newGenre: Genre = { name, color: '#6b7280' }
  const updated = [...genres, newGenre]
  await window.api.invoke('settings:genres-set', updated)
  setGenres(updated)
}
```

### 2. GenrePicker コンポーネント

`src/renderer/src/components/GenrePicker.tsx` を新規作成する。

```
[ ジャンルなし ▼ ]
  ───────────────
  ● 仕事
  ● 個人
  ───────────────
  + 新しいジャンルを追加
```

- カスタムドロップダウン（`<div>` ベース）として実装し、ネイティブ `<select>` は使わない
  - 理由: 各選択肢にジャンルの色スウォッチを表示するため
- ドロップダウンを開くトリガーは現在の選択ジャンルを表示するボタン（色スウォッチ付き）
- 「+ 新しいジャンルを追加」を選ぶとドロップダウン内にインライン入力フォームが展開する
- 新規ジャンル入力フォームは名前のみ（色は後から設定画面で変更可能）
- Enter キーまたは「追加」ボタンで登録・選択し、フォームを閉じる

```tsx
type Props = {
  value: string | null
  genres: Genre[]
  onChange: (value: string | null) => void
  onAddGenre: (name: string) => Promise<void>
}
```

### 3. TaskItem の変更

- `editGenre: string` ステートはそのまま保持（保存時に `genre: editGenre || null`）
- ジャンルの `<input type="text">` を `<GenrePicker>` に差し替える

```tsx
<GenrePicker
  value={editGenre || null}
  genres={genres}    // DataContext から取得
  onChange={(v) => setEditGenre(v ?? '')}
  onAddGenre={addGenre}  // DataContext から取得
/>
```

### 4. ドロップダウンの外クリック閉じ

`useRef` + `useEffect` でドキュメントの `mousedown` を監視し、ドロップダウン外クリックで閉じる。

### 5. 既存タスクのジャンルへの対応

既存タスクに設定されているジャンルが設定画面の登録済みリストに存在しない場合（旧データ等）、GenrePicker はそのジャンル名を選択肢に表示する（`genres` リストに含まれない場合は末尾に追加して表示）。これにより既存データが失われない。

## ファイル変更一覧

| ファイル | 変更内容 |
|---|---|
| `src/renderer/src/context/DataContext.tsx` | `genres`, `addGenre` を追加 |
| `src/renderer/src/components/GenrePicker.tsx` | 新規作成 |
| `src/renderer/src/components/TaskItem.tsx` | ジャンル入力を `GenrePicker` に差し替え |
| `src/renderer/src/index.css` | `GenrePicker` スタイルを追加 |

## Risks / Trade-offs

- [カスタムドロップダウンのアクセシビリティ] ネイティブ `<select>` より実装コストが高いが、色スウォッチ表示のために必要。ARIA 属性は今回は省略し最小実装とする。
- [既存フリーテキストジャンルの扱い] 旧データとの互換性のため、登録リストにない値も表示可能にする（#5）。完全な制限は将来対応とする。
