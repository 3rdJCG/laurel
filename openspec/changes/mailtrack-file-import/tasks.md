## 1. データモデルと型定義

- [ ] 1.1 `src/renderer/src/types.ts` に `MailtrackCandidate` 型を追加する
      (`fileName: string`, `subject: string`, `from: string`, `receivedAt: string`, `bodyText: string`)
- [ ] 1.2 `src/renderer/src/types.ts` の `Task` 型に `source: { type: 'mailtrack'; fileName: string; body: string } | null` フィールドを追加する
- [ ] 1.3 `src/main/storage/settings.ts` の `AppSettings` 型に `mailtrackDir: string | null` を追加し、デフォルト値を `null` にする

## 2. メインプロセス: mailtrackStore

- [ ] 2.1 `src/main/storage/mailtrackStore.ts` を新規作成する
      - `loadState(userDataPath: string): Promise<Set<string>>` — 処理済みファイル名の Set を返す（ファイル未存在時は空 Set）
      - `saveState(userDataPath: string, processed: Set<string>): Promise<void>` — 処理済み状態を `mailtrack-state.json` に書き込む
      - `scanCandidates(mailtrackDir: string, processed: Set<string>): Promise<MailtrackCandidate[]>` — 未処理 JSON ファイルをパースして返す
      - `stripHtml(html: string): string` — HTML タグを除去してプレーンテキストを返す（正規表現ベース）
- [ ] 2.2 `src/main/storage/projectStore.ts` の読み込み時に `task.source` が未定義の場合 `null` を補完する migration を追加する

## 3. IPC ハンドラ登録

- [ ] 3.1 `src/main/index.ts` に `mailtrack:get-candidates` ハンドラを追加する
      （`mailtrackDir` が未設定なら空配列を返す）
- [ ] 3.2 `src/main/index.ts` に `mailtrack:assign` ハンドラを追加する
      （`fileName: string`, `projectId: string` を受け取り、タスクをプロジェクトファイルに追加して処理済みマーク）
- [ ] 3.3 `src/main/index.ts` に `mailtrack:discard` ハンドラを追加する
      （`fileName: string` を受け取り、処理済みマーク）

## 4. Preload API 追加

- [ ] 4.1 `src/preload/index.ts` の `electronAPI` に以下のメソッドを追加する
      - `getMailtrackCandidates(): Promise<MailtrackCandidate[]>`
      - `assignMailtrack(fileName: string, projectId: string): Promise<{ ok: boolean; error?: string }>`
      - `discardMailtrack(fileName: string): Promise<{ ok: boolean }>`

## 5. 設定画面: mailtrackDir 設定 UI

- [ ] 5.1 `src/renderer/src/screens/SettingsScreen.tsx` に mailtrack フォルダ設定セクションを追加する
      - 現在のフォルダパスを表示する（未設定なら「未設定」と表示）
      - 「フォルダを選択」ボタンで `dialog:open-folder` を呼び出してパスを設定する
      - 「クリア」ボタンで `mailtrackDir` を `null` に戻す
      - 変更は既存の「変更を保存」フローに統合する

## 6. Forge Today スクリーン

- [ ] 6.1 `src/renderer/src/screens/ForgeTodayScreen.tsx` を新規作成する
      - コンポーネントマウント時に `getMailtrackCandidates()` を呼び出して候補リストを取得する
      - 先頭1件をカード表示する（件名・送信者・受信日時・本文プレビュー最大 200 文字）
      - プロジェクト選択ドロップダウン（DataContext の `projects` を使用）と「追加」ボタンを表示する
      - 「破棄」ボタンをカードに表示する
      - 「追加」押下時: `assignMailtrack(fileName, projectId)` を呼び出し、成功したら次の候補を表示する
      - 「破棄」押下時: `discardMailtrack(fileName)` を呼び出し、次の候補を表示する
      - 候補が0件の場合: 「受信メールはすべて処理済みです」メッセージを表示する
      - `mailtrackDir` 未設定の場合: 設定画面への遷移ボタンを含むメッセージを表示する

## 7. ナビゲーション更新

- [ ] 7.1 `src/renderer/src/components/Sidebar.tsx` の `View` 型に `{ type: 'forge-today' }` を追加する
- [ ] 7.2 `Sidebar.tsx` にサイドバーの Forge Today ボタンを追加する（Home ボタンの下）
- [ ] 7.3 `src/renderer/src/App.tsx` の `renderMain` に `'forge-today'` ケースを追加して `ForgeTodayScreen` を返す

## 8. 動作確認

- [ ] 8.1 設定画面で mailtrack フォルダを指定でき、再起動後も設定が保持されることを確認する
- [ ] 8.2 指定フォルダに JSON ファイルを置いて Forge Today 画面でカードが表示されることを確認する
- [ ] 8.3 プロジェクトを選択して「追加」すると該当プロジェクトにタスクが追加されることを確認する
- [ ] 8.4 「破棄」すると次のカードへ進み、再起動後も破棄済みカードが表示されないことを確認する
- [ ] 8.5 mailtrack フォルダ内のファイルのタイムスタンプ・内容が変更されていないことを確認する
- [ ] 8.6 mailtrackDir 未設定時に Forge Today 画面で設定誘導メッセージが表示されることを確認する
- [ ] 8.7 `npm run typecheck` でエラーがないことを確認する
