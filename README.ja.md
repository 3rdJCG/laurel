# Laurel

ローカルで動作するタスク管理アプリ（Electron製）

[English README](./README.md)

## 概要

Laurel は、すべてのデータをお使いのコンピューター上に保存するデスクトップタスク管理アプリです。アカウント登録不要・クラウド同期なし・インターネット接続不要。データは完全にローカルで管理されます。

## 機能

- **プロジェクト管理** — タスクをプロジェクト単位で整理
- **タスク・サブタスク** — 階層構造のタスク管理。ドラッグ&ドロップで並び替え可能
- **イシュー＆コメント** — タスクにイシューやコメントを紐づけ（GitHubライクなUI）
- **ジャンル管理** — タスクをジャンルで分類。表示・非表示の切り替えが可能
- **タグフィルター** — タグをつけてフィルタリング
- **ローカルストレージ** — 指定したフォルダにJSONファイルとして保存
- **自動アップデート** — GitHub Releases 経由でアプリ内アップデート（安定版 / テスター版チャンネルを選択可能）

## ダウンロード

[Releases](../../releases) ページから最新のインストーラーをダウンロードしてください。

> **注意:** コード署名を行っていないため、初回起動時に Windows SmartScreen の警告が表示される場合があります。「詳細情報」→「実行」をクリックして続行してください。

## 開発

### 必要な環境

- Node.js 20 以上
- npm 10 以上

### セットアップ

```bash
git clone https://github.com/3rdJCG/laurel.git
cd laurel
npm install
npm run dev
```

### コマンド一覧

```bash
npm run dev          # 開発サーバーを起動
npm run build        # プロダクションビルド（型チェック込み）
npm run typecheck    # 型チェックのみ
npm run build:win    # Windows インストーラー（.exe）
npm run build:mac    # macOS（.dmg）
npm run build:linux  # Linux（.AppImage）
```

## プライバシー

Laurel は個人情報を一切収集せず、インターネットへの通信も行いません。すべてのデータはローカルの JSON ファイルとして保存されます。詳細は [docs/PRIVACY.md](./docs/PRIVACY.md) をご覧ください。

## 技術スタック

- [Electron](https://www.electronjs.org/) 41
- [React](https://react.dev/) 18 + [TypeScript](https://www.typescriptlang.org/) 5
- [electron-vite](https://electron-vite.org/) 3
- [electron-updater](https://www.electron.build/auto-update) — 自動アップデート
- [@dnd-kit](https://dndkit.com/) — ドラッグ&ドロップ
- [chokidar](https://github.com/paulmillr/chokidar) — ファイル監視

## コミットメッセージ規約

フォーマット: `<emoji> <type>: <説明>`

| Emoji | Type | 用途 |
|---|---|---|
| 📋 | `spec` | 提案・仕様・設計ドキュメントの追加・更新 |
| ✅ | `tasks` | タスクリストの更新・完了 |
| ✨ | `feat` | 新機能の追加 |
| 🐛 | `fix` | バグ修正 |
| ♻️ | `refactor` | 動作を変えないリファクタリング |
| 💄 | `style` | UIスタイルの変更 |
| 🔧 | `chore` | ビルド設定・依存関係の変更 |
| 📝 | `docs` | ドキュメントの変更 |
| 🎉 | `init` | 初回コミット・初期セットアップ |

## ライセンス

MIT
