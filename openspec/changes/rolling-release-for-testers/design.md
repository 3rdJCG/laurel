## Context

electron-builder（既存 devDependency）と electron-updater（新規追加）を組み合わせ、
GitHub Releases を配布チャネルとして使用する2チャンネル構成を構築する。

## Goals / Non-Goals

**Goals:**
- master push で自動的に Windows 向け NSIS インストーラをビルド・公開する（stable）
- develop push でテスター向けの beta ビルドを公開する
- ユーザーがアプリ内で stable / beta チャンネルを選択できる
- チャンネル切り替え後は次回アップデートチェック時に反映される

**Non-Goals:**
- macOS / Linux 向けビルド（将来対応として留保）
- コードサイニング（テスター向けのため SmartScreen バイパスで対応）

## Decisions

### 1. チャンネル構成

electron-updater の公式チャンネル機能を使用：
- `autoUpdater.channel = 'latest'` → stable のみ追う
- `autoUpdater.channel = 'beta'` → beta + stable の新しい方を追う
- `generateUpdatesFilesForAllChannels: true` で `latest.yml` / `beta.yml` を両方生成

`allowPrerelease` は使用しない（チャンネルシステムと干渉するため）。

### 2. バージョン管理

- stable（master）: `1.0.5`, `1.0.6` ... 手動 patch bump
- beta（develop）: `1.0.6-beta.1`, `1.0.6-beta.2` ... 手動 bump
- develop → master マージ時: `-beta.N` を除去して bump（`1.0.6-beta.2` → `1.0.6`）

### 3. CI/CD ワークフロー構成

2つのワークフローファイルに分離：
- `release.yml`: master push → 正式版
- `release-beta.yml`: develop push → beta pre-release

`electron-builder.yml` の publish セクションは `releaseType` を持たず、
各 workflow で `--publish always` を使い、GitHub Releases の pre-release フラグは
electron-builder がバージョンの `-beta` サフィックスを検出して自動設定する。

### 4. アプリ内チャンネル選択

`settings.ts` の `Settings` 型に `updateChannel: 'latest' | 'beta'` を追加（デフォルト: `'latest'`）。
updater.ts は起動時に設定を読み込み `autoUpdater.channel` を設定する。
設定画面にラジオボタン（安定版 / テスター版）を追加し、変更時は IPC で保存。

チャンネル変更後の挙動：
- beta → stable に切り替えた場合、次回チェック時に stable の最新版がある場合は自動ダウングレード
- これは electron-updater の設計された動作（`allowDowngrade` が自動 `true` になる）

## Architecture

```
.github/workflows/release.yml         # master → stable release
.github/workflows/release-beta.yml    # develop → beta pre-release
electron-builder.yml                   # build/publish config
src/main/updater.ts                    # auto-update logic (new)
src/main/index.ts                      # wire updater (2 lines)
src/main/storage/settings.ts          # add updateChannel field
src/renderer/src/...SettingsPanel...  # channel toggle UI
```

## GitHub Actions ランナーのツール要件

`windows-latest` ランナーで追加インストール不要な理由：
- ネイティブ Node.js モジュールなし（全依存が Pure JS）→ Python/C++ Build Tools 不要
- NSIS（Windows インストーラ生成ツール）は electron-builder が自動ダウンロード
- ワークフロー必要手順: `actions/setup-node@v4` + `npm ci` のみで完結

## GitHub Actions コスト

| リポジトリ種別 | コスト |
|--------------|--------|
| **Public（推奨）** | **$0 / 無制限** |
| Private / Free プラン | 月 62 ビルドで上限（❌ 不足） |
| Private / Pro プラン | 月 93 ビルドで上限（△ ギリギリ） |

→ **Public リポジトリで運用する前提。**

## Risks / Trade-offs

- [GitHub Actions の permissions 設定が必要] → Settings > Actions > Workflow permissions = "Read and write"
- [初回インストールは手動] → GitHub Releases ページから .exe を手動 DL、2回目以降は自動
- [SmartScreen 警告] → テスター向けオンボーディングドキュメントに記載
- [beta → stable でダウングレードが発生] → チャンネル切り替え時にダイアログで説明することを検討
