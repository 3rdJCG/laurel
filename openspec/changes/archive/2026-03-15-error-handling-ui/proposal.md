## Why

`implement-data-persistence` の Risks セクションに「UNCパスへのアクセス権限がない場合はエラーをレンダラーに通知してフォールバック」と記載があるが、エラー通知のUIや破損JSONの挙動が仕様として定義されていない。実装者が独自判断することになり、UX が不定になる。

## What Changes

- ストレージへの読み書き失敗時にユーザーへ通知するエラーUIを定義する
- JSON ファイルが破損していた場合の挙動（スキップ・通知・復旧オプション）を定義する
- エラー状態からの復帰フローを定義する

## Capabilities

### New Capabilities

- `storage-error-notification`: ストレージ操作失敗時のユーザー向けエラー通知UI
- `corrupted-file-handling`: 破損・不正JSONファイルの検出と挙動定義

### Modified Capabilities

（なし）

## Impact

- `data:save-project` / `data:load-all` IPC のエラー応答をレンダラーで処理するコードが必要
- エラーバナー・トーストまたはダイアログコンポーネントの追加
- 既存 IPC ハンドラー（`implement-data-persistence` で定義）のエラーレスポンス形式に依存