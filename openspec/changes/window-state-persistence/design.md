## Context

`src/main/index.ts` の `createWindow()` 関数はウィンドウを固定サイズ（`width: 900, height: 670`）で生成しており、位置・サイズの保存・復元は一切行っていない。Electron はメインプロセスで `app.getPath('userData')` にアクセスできるため、Node.js の `fs` モジュールで JSON ファイルを読み書きするだけで永続化できる。外部ライブラリは不要。

## Goals / Non-Goals

**Goals:**
- アプリ終了時にウィンドウのサイズ（`width`, `height`）と位置（`x`, `y`）を `userData/window-state.json` に保存する
- 次回起動時にそのファイルを読み込み、`BrowserWindow` の初期サイズ・位置として使用する
- ファイルが存在しない場合（初回起動）はデフォルト値（`900×670`、位置なし）にフォールバックする

**Non-Goals:**
- 最大化・最小化・フルスクリーン状態の保存
- マルチウィンドウ対応
- タスク・プロジェクトデータの保存（`implement-data-persistence` の担当）
- 保存タイミングの最適化（毎フレームではなく `close` イベント時のみ）

## Decisions

### 1. 専用ユーティリティモジュール `src/main/windowState.ts` を新設
`createWindow()` に直接書くと肥大化するため、読み書きロジックを分離する。

インターフェース:
```ts
type WindowState = { width: number; height: number; x?: number; y?: number }
function loadWindowState(): WindowState
function saveWindowState(win: BrowserWindow): void
```

**理由**: テスト可能性と関心の分離。`index.ts` は変更を最小限（呼び出し追加のみ）に抑えられる。

### 2. 保存タイミングは `close` イベント（`BrowserWindow` の）
`resize`/`move` イベントのたびに書くとディスク I/O が増える。`close` 直前に一度だけ書くのが最小コストで十分。

**代替案**: `will-quit` アプリイベントで全ウィンドウを保存。シングルウィンドウなので差異なし。`close` を採用。

### 3. 保存先: `app.getPath('userData')/window-state.json`
タスクデータ（`implement-data-persistence` では `<userData>/laurel/<id>.json`）と分離した独立ファイルにする。フォーマット変更時に互いに影響しない。

### 4. 最大化状態は保存しない（スコープ外）
最大化を保存すると `x/y` が無意味になり、マルチモニター環境での挙動が複雑になる。初回実装では除外し、必要に応じて後続の変更で追加する。

## Risks / Trade-offs

- [Risk] マルチモニター環境でモニターを外した後に復元すると、ウィンドウが画面外に配置される
  → Mitigation: 復元時に `screen.getAllDisplays()` で表示領域に収まるかチェックし、収まらなければ位置をリセットする（スペック上は「表示領域内に収める」要件として定義）

- [Risk] `window-state.json` が破損していた場合
  → Mitigation: `JSON.parse` を `try/catch` で囲み、失敗時はデフォルト値を使用する

- [Trade-off] `close` 時のみ保存するため、クラッシュ時は直前のサイズ・位置が失われる
  → 許容。ウィンドウ状態の欠損は軽微なUX低下であり、データロスではない。