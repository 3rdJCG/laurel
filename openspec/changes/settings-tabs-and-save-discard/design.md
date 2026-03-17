## Context

現在の `SettingsScreen.tsx` は縦一列に3セクションを並べ、画面下部に単一の「変更を保存」ボタンを置く構成。ジャンル変更は即時保存（`saveGenres` → IPC呼び出し）で、データ保存先とユーザー情報は「変更を保存」で一括保存するという動作が混在している。`App.tsx` では `currentView.type === 'settings'` のとき `<SettingsScreen />` を描画するだけで、離脱ガードはない。

## Goals / Non-Goals

**Goals:**
- 設定画面を3タブ（データ保存先 / ユーザー情報 / カテゴリ管理）に分割する
- 各タブで「保存」「破棄」ボタンを提供し、変更を明示的に確定させる
- タブ切り替え・画面離脱時に未保存変更があれば確認を取る
- タブUIは既存の `repo-tabs` / `repo-tab` CSSクラスを流用する

**Non-Goals:**
- タグ管理 UI の実装（カテゴリ管理タブにプレースホルダーのみ置く）
- IPC層の変更（既存の `settings:set` / `settings:user-info-set` / `settings:genres-set` をそのまま使う）
- カスタム確認ダイアログコンポーネントの新規作成（Electron の `window.confirm` を使用）

## Decisions

### 1. タブ構成

```
type SettingsTab = 'storage' | 'user' | 'categories'
```

| タブ名 | ID | 内容 |
|---|---|---|
| データ保存先 | `storage` | 保存フォルダパス変更 |
| ユーザー情報 | `user` | 表示名・メールアドレス |
| カテゴリ管理 | `categories` | ジャンル管理 + タグ管理（将来） |

### 2. タブUI

既存の `repo-tabs` / `repo-tab` / `repo-tab--active` CSSクラスをそのまま使い、`TaskDetailScreen` と見た目を統一する。

```tsx
<div className="repo-tabs">
  <button
    className={`repo-tab ${activeTab === 'storage' ? 'repo-tab--active' : ''}`}
    onClick={() => handleTabChange('storage')}
  >
    データ保存先
  </button>
  {/* ...他タブ */}
</div>
```

### 3. Draft State（タブ別未保存状態）

各タブのフォーム値を「draft」として管理し、保存前はローカルのみに反映する。ロード済みの「saved」値と比較して dirty フラグを算出する。

```tsx
// storage タブ
const [draftDataDir, setDraftDataDir] = useState('')
const [savedDataDir, setSavedDataDir] = useState('')
const storageIsDirty = draftDataDir !== savedDataDir

// user タブ
const [draftName, setDraftName] = useState('')
const [draftMail, setDraftMail] = useState('')
const [savedName, setSavedName] = useState('')
const [savedMail, setSavedMail] = useState('')
const userIsDirty = draftName !== savedName || draftMail !== savedMail

// categories タブ: ジャンルは即時保存を維持（保存/破棄ボタンは表示するが、
//   ジャンル追加・削除・色変更は従来通り即時保存）
//   → ただし設計を統一するため、categories タブも draft 管理に切り替える
const [draftGenres, setDraftGenres] = useState<Genre[]>([])
const [savedGenres, setSavedGenres] = useState<Genre[]>([])
const categoriesIsDirty = JSON.stringify(draftGenres) !== JSON.stringify(savedGenres)
```

カテゴリ管理タブも draft 管理に統一することで、保存ボタンを押すまで IPC が呼ばれない一貫したUXになる。

### 4. 保存・破棄ボタン

各タブコンテンツの下部（または固定フッター）に配置する。

```tsx
<div className="settings-tab-footer">
  <button onClick={handleSave} disabled={saving || !isDirty}>
    {saving ? '保存中...' : '保存'}
  </button>
  <button onClick={handleDiscard} disabled={!isDirty}>
    破棄
  </button>
  {errorMsg && <span className="error-message">{errorMsg}</span>}
  {successMsg && <span className="success-message">{successMsg}</span>}
</div>
```

「破棄」ボタン押下時は `loadSettings()` を再実行して draft を saved 値にリセットする。

### 5. 未保存変更の確認ガード

**タブ切り替え時（SettingsScreen 内部）:**

```tsx
const handleTabChange = (next: SettingsTab): void => {
  if (currentTabIsDirty) {
    const ok = window.confirm('このタブの変更が保存されていません。破棄して移動しますか？')
    if (!ok) return
    discardCurrentTab()
  }
  setActiveTab(next)
}
```

**設定画面離脱時（Sidebar からの画面遷移）:**

`App.tsx` は `SettingsScreen` に `registerDirtyChecker` prop を渡す。`SettingsScreen` はマウント時にこの関数を呼んで「現在 dirty かどうかを返す関数」を登録する。

```tsx
// App.tsx
const settingsIsDirtyRef = useRef<() => boolean>(() => false)

const handleNavigate = (view: View): void => {
  if (currentView.type === 'settings' && settingsIsDirtyRef.current()) {
    const ok = window.confirm('設定の変更が保存されていません。破棄して移動しますか？')
    if (!ok) return
  }
  setCurrentView(view)
}

// SettingsScreen に渡す
<SettingsScreen registerDirtyChecker={(fn) => { settingsIsDirtyRef.current = fn }} />
```

```tsx
// SettingsScreen.tsx
type Props = {
  registerDirtyChecker: (fn: () => boolean) => void
}

export function SettingsScreen({ registerDirtyChecker }: Props): JSX.Element {
  // ...
  useEffect(() => {
    registerDirtyChecker(() => storageIsDirty || userIsDirty || categoriesIsDirty)
  }, [storageIsDirty, userIsDirty, categoriesIsDirty])
```

### 6. カテゴリ管理タブの draft 管理

ジャンル操作（追加・削除・色変更）は draft 配列のみを更新し、IPCは呼ばない。「保存」ボタン押下時に `settings:genres-set` を呼ぶ。

削除確認UI（`deletingGenre` state）は従来通り維持する。

タグ管理は将来実装のため、タブ内に「タグ管理（近日追加予定）」のプレースホルダーを表示する。

### 7. ロード処理

`loadSettings()` は初期マウント時のみ実行し、設定値を saved 変数と draft 変数の両方に適用する。破棄時も同じ関数を使って draft を saved にリセットする。

## ファイル変更一覧

| ファイル | 変更内容 |
|---|---|
| `src/renderer/src/screens/SettingsScreen.tsx` | タブ構成・draft state管理・保存/破棄ボタン・タブ切り替えガード・registerDirtyChecker 対応 |
| `src/renderer/src/App.tsx` | `settingsIsDirtyRef` 追加、`handleNavigate` に離脱ガード追加、`SettingsScreen` に `registerDirtyChecker` prop を渡す |
| `src/renderer/src/index.css` | `settings-tab-footer` スタイル追加（タブUI自体は既存 `repo-tabs` を流用） |

## Risks / Trade-offs

- [`window.confirm` の見た目] Electron ではネイティブダイアログが表示される。アプリのUIと統一感がないが、初期実装として十分。将来カスタムモーダルに差し替え可能。
- [ジャンル操作の即時保存廃止] 既存の挙動（色変更が即時反映）からの変更。保存ボタンを押すまで IPC 未実行となる。ユーザーが「カラーピッカーを操作 → 画面上では変わって見える → 保存せずに閉じる」ケースで混乱する可能性があるが、保存/破棄ボタンと dirty 表示で対応できる。
- [`categoriesIsDirty` の比較] `JSON.stringify` による配列比較は順序依存のため、ジャンルの並び替えが発生しない限り問題なし。
