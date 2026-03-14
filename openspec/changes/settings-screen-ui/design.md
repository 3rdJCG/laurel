## Context

Laurel は Electron アプリ（React + TypeScript）。`implement-data-persistence` change でバックエンドの `settings:get` / `settings:set` IPC が定義されている。現在レンダラーには設定画面が存在しない。メインプロセスは `dialog.showOpenDialog` でOS のフォルダ選択ダイアログを開けるが、レンダラーからは IPC 経由でのみ呼び出せる。

## Goals / Non-Goals

**Goals:**
- 設定画面コンポーネントを実装し、現在の保存先を表示・変更できる UI を提供する
- OS のフォルダ選択ダイアログ（`dialog.showOpenDialog`）を IPC 経由で呼び出す
- UNC パスを手入力できるテキストフィールドを提供する
- 保存先変更時のエラー（アクセス不可・存在しないパス）を UI 上で通知する
- メイン画面から設定画面へのナビゲーションを追加する

**Non-Goals:**
- 保存先以外の設定項目（テーマ・言語・フォントサイズ等）の実装
- 設定画面の多言語対応
- `implement-data-persistence` のバックエンド実装そのもの

## Decisions

### 1. 設定画面の表示方式: モーダルダイアログ

設定項目が現時点では保存先のみと少ないため、専用ルートではなくモーダルで表示する。

**理由:**
- 設定の変更は一時的なタスクであり、メイン画面のコンテキスト（プロジェクト一覧）を背景に残したほうが UX が自然
- 専用ルート（React Router 等）の導入を避けることで実装を最小化できる

**代替案:** 専用のフルスクリーン設定ページ → 項目が増えた場合に移行検討

### 2. フォルダ選択: OS ダイアログ ＋ UNC パス手入力フィールドの併用

フォルダ選択ボタンで `dialog:open-folder` IPC を呼び出し、OS のネイティブダイアログを使う。UNC パス（`\\server\share\folder`）はネイティブダイアログから選択できない場合があるため、テキストフィールドで直接入力もできるようにする。

**IPC チャンネル追加:**
```
レンダラー → メインプロセス（invoke）:
  'dialog:open-folder'  → キャンセル時は null、選択時は選択パス文字列を返す
```

**メインプロセス実装:**
```ts
ipcMain.handle('dialog:open-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})
```

### 3. 保存先変更フロー

1. ユーザーがフォルダ選択またはパス手入力で新パスを指定
2. 「変更を保存」ボタン押下時に `settings:set` IPC を呼び出す
3. レスポンスがエラーの場合はエラーメッセージをインライン表示
4. 成功時はモーダルを閉じる（または成功トーストを表示）

`settings:set` の成功/失敗通知は `implement-data-persistence` の IPC 設計に従う。エラー時の UI フォールバック（デフォルトパスへの復元）はバックエンド側で行われ、UIは再度 `settings:get` を呼んで表示を更新する。

### 4. コンポーネント構成

```
src/renderer/src/
├── components/
│   └── SettingsModal.tsx     # モーダル本体（現在パス表示・フォルダ選択・手入力・保存ボタン）
└── App.tsx                   # 設定ボタン追加・SettingsModal の開閉状態管理
```

既存コンポーネントへの影響を `App.tsx` の最小変更に留める。

## Risks / Trade-offs

- [UNC パス検証] OS ダイアログでは UNC パスを選べないため手入力に依存する。入力値の検証は `settings:set` 呼び出し後のエラーレスポンスに委ねる（フロントで事前検証しない）→ エラーメッセージが発生する可能性があるがバックエンドのエラー処理で対応済み
- [設定項目の将来的な増加] モーダル方式はスペースが限られるため、設定項目が増えた場合は専用ページへの移行が必要になる可能性がある → 現時点ではシンプルさを優先