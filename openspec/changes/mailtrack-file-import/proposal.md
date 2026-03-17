## Why

外部ツール mailtrack がメールデータをローカルフォルダへ JSON ファイルとして出力している。ユーザーはこれらのメールをタスク候補として Laurel に取り込みたいが、現状は手動でタスクを作成するしかない。メール1件ずつを確認しながらプロジェクトへ割り振る専用フローがあれば、受信ボックスを処理する GTD 的な作業が効率化できる。

## What Changes

- 新画面 "Forge Today" を追加する（`View` 型に `{ type: 'forge-today' }` を追加）
- 設定画面に mailtrack 読み込みフォルダパスの設定を追加する
- mailtrack JSON ファイルのスキャン・処理状態管理をメインプロセスに追加する
- サイドバーに Forge Today へのナビゲーションボタンを追加する
- `Task` 型に `source` フィールドを追加してメール由来のタスクを識別・本文保存できるようにする

## Capabilities

### New Capabilities

- `forge-today-screen`: mailtrack から読み込んだメールをカード1枚ずつ表示し、プロジェクトへの割り振りまたは破棄を操作できる画面
- `mailtrack-folder-setting`: 設定画面で mailtrack JSON ファイルが置かれるフォルダを指定できる
- `mailtrack-state-management`: 処理済みファイルを Laurel 独自のファイルで追跡する（mailtrack ファイル自体への操作は禁止）

### Modified Capabilities

- `task-model`: `source` フィールドを追加（mailtrack由来のタスクにメール本文を保存）
- `settings-screen`: mailtrackDir 設定項目を追加

## Impact

- `src/renderer/src/screens/ForgeTodayScreen.tsx`（新規）
- `src/renderer/src/components/Sidebar.tsx`（`View` 型に `forge-today` 追加、ボタン追加）
- `src/renderer/src/screens/SettingsScreen.tsx`（mailtrackDir 設定セクション追加）
- `src/main/storage/mailtrackStore.ts`（新規）
- `src/main/storage/settings.ts`（`AppSettings` に `mailtrackDir` 追加）
- `src/main/index.ts`（IPC ハンドラ追加）
- `src/preload/index.ts`（electronAPI に mailtrack メソッド追加）
- `src/renderer/src/types.ts`（`MailtrackCandidate` 型・`Task.source` フィールド追加）
