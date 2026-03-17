## Why

テスターへのアプリ配布が手作業のため、新バージョンを渡すたびに手動でビルドして送付する必要がある。
テスター側も新バージョンの存在を自分で確認して手動インストールしなければならず、フィードバックサイクルが遅い。

正式版（master）とテスター向けプレリリース（develop）の2チャンネル並行リリースを構築し、
ユーザーがアプリ内でどちらのチャンネルを追うかを選択できるようにする。

## What Changes

- `master` push で正式版を GitHub Releases（regular release）に自動公開
- `develop` push でテスター向けを GitHub Releases（pre-release）に自動公開
- electron-updater によるアプリ内自動アップデート機構を実装
- アプリ内設定でアップデートチャンネル（stable / beta）を切り替え可能にする
- バージョン管理: stable は `1.x.y`、beta は `1.x.y-beta.N` の semver

## Capabilities

### New Capabilities

- `ci-release-stable`: master push → GitHub Actions → Windows ビルド → GitHub Release 自動公開
- `ci-release-beta`: develop push → GitHub Actions → Windows ビルド → GitHub pre-release 自動公開
- `in-app-auto-update`: アプリ起動時・定期チェックで新バージョンを検出し、ダウンロード後に再起動ダイアログ表示
- `update-channel-setting`: アプリ内設定でアップデートチャンネルを stable / beta から選択

### Modified Capabilities

- `settings`: `updateChannel` フィールドを追加

## Impact

- `.github/workflows/release.yml` 新規作成（stable: master トリガー）
- `.github/workflows/release-beta.yml` 新規作成（beta: develop トリガー）
- `electron-builder.yml` 新規作成（パッケージング設定）
- `src/main/updater.ts` 新規作成（自動アップデートロジック）
- `src/main/index.ts` 修正（updater 初期化呼び出し追加）
- `src/main/storage/settings.ts` 修正（`updateChannel` フィールド追加）
- `package.json` 修正（`electron-updater` を dependencies に追加）
- 設定画面 UI にチャンネル選択を追加
