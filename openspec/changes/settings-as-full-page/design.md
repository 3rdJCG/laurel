## Context

Laurel は Electron アプリ（React + TypeScript）。`settings-screen-ui` change で `SettingsModal.tsx` が実装済みで、サイドバーの Settings ボタンクリックでモーダルが開く。`App.tsx` は `currentView`（`home` / `project`）でビュー管理し、`Sidebar.tsx` の `View` 型もこれに対応している。

## Goals / Non-Goals

**Goals:**
- 設定画面を Home・Project と同じ専用ビューとして表示する
- サイドバーで設定画面を選択中にアクティブ状態を表示する
- モーダル固有の状態管理（`isSettingsOpen`）を除去する

**Non-Goals:**
- 設定項目の追加・変更
- About 画面のモーダルからビューへの変更（別 change で対応）
- アニメーション・トランジションの実装

## Decisions

### 1. 設定画面の表示方式: 専用ビュー（フルページ）

設定画面を `<main>` エリアに `HomeScreen` / `ProjectScreen` と同様に表示する。

**理由:**
- Home・Project と一貫したナビゲーション体験になる
- サイドバーのアクティブ状態がナビゲーション位置を明示できる
- `isSettingsOpen` のような別管理の状態が不要になりシンプルになる
- 設定項目が増えた場合もスペースに余裕がある

### 2. コンポーネント構成の変更

`SettingsModal.tsx` を `SettingsScreen.tsx` にリネームし、モーダルのオーバーレイ・開閉 props（`isOpen`, `onClose`）を除去する。
保存成功時の「モーダルを閉じる」動作は「Home 画面へ遷移する」に変更する。

```
src/renderer/src/
├── screens/
│   ├── HomeScreen.tsx         # 既存（変更なし）
│   ├── ProjectScreen.tsx      # 既存（変更なし）
│   └── SettingsScreen.tsx     # SettingsModal.tsx からリネーム・改修
└── components/
    ├── Sidebar.tsx             # View 型に 'settings' 追加、onSettingsOpen 削除
    └── SettingsModal.tsx       # 削除
```

### 3. View 型・ルーティングの変更

`Sidebar.tsx` の `View` 型に `{ type: 'settings' }` を追加する。
`App.tsx` の `renderMain` に `settings` ケースを追加し `SettingsScreen` を返す。
`isSettingsOpen` / `onSettingsOpen` を削除し、`onNavigate({ type: 'settings' })` に統一する。

```ts
// Sidebar.tsx
export type View =
  | { type: 'home' }
  | { type: 'project'; projectId: string }
  | { type: 'settings' }
```

### 4. 保存成功後の遷移

モーダル時は「閉じる」だったが、ビューになるため保存成功後は `onNavigateHome` ではなくそのまま設定画面に留まる（または Home へ遷移する `onNavigate` prop を渡す）。
シンプルさを優先し、保存成功後も設定画面に留まり成功メッセージをインライン表示する。

## Risks / Trade-offs

- [SettingsModal.tsx の削除] 既存タスク 4.1〜4.5 の手動確認が未完のため、リネーム後に同等の動作確認が必要
- [About はモーダルのまま] Settings のみビュー化するため、Settings と About で表示パターンが異なる。将来的には About もビュー化することを検討する
