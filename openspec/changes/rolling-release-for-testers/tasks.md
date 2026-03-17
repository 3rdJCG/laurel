## 1. 依存ライブラリの追加

- [x] 1.1 `npm install electron-updater` で electron-updater を dependencies に追加する

## 2. パッケージング設定

- [x] 2.1 `electron-builder.yml` をプロジェクトルートに新規作成する
      （appId, win/nsis x64, publish: github provider, generateUpdatesFilesForAllChannels: true）

## 3. 自動アップデートモジュールの実装

- [x] 3.1 `src/main/updater.ts` を新規作成する
      （setupAutoUpdater: 設定からチャンネル読み込み、起動時チェック + 4時間ごと定期チェック、
        update-downloaded ダイアログ（日本語）、エラーログ）
- [x] 3.2 `src/main/index.ts` に import を追加し、`createWindow()` 直後に `setupAutoUpdater(mainWindow!)` を呼び出す

## 4. 設定へのチャンネルフィールド追加

- [x] 4.1 `src/main/storage/settings.ts` の `Settings` 型に `updateChannel: 'latest' | 'beta'` を追加（デフォルト: `'latest'`）
- [x] 4.2 `settings:set` IPC ハンドラでチャンネル変更時に `autoUpdater.channel` を再設定できるよう updater に関数を公開する
- [x] 4.3 設定画面（SettingsPanel 等）にアップデートチャンネル選択 UI を追加する（安定版 / テスター版）

## 5. CI/CD ワークフローの設定

- [x] 5.1 `.github/workflows/release.yml` を新規作成する（master push → stable release）
- [x] 5.2 `.github/workflows/release-beta.yml` を新規作成する（develop push → beta pre-release）
- [x] 5.3 GitHub リポジトリ設定で Actions の Workflow permissions を「Read and write permissions」に変更する

## 6. 動作確認

- [x] 6.1 `npm run typecheck` で型エラーがないことを確認する
- [x] 6.2 `npm run build:win -- --publish never` でローカルビルドが成功することを確認する
- [ ] 6.3 develop に push して GitHub Actions (beta) が成功し pre-release が作成されることを確認する
- [ ] 6.4 master に push して GitHub Actions (stable) が成功し regular release が作成されることを確認する
- [ ] 6.5 beta チャンネルのアプリが新しい beta ビルドを検出して自動更新ダイアログを表示することを確認する
