<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Laurel

ローカルで動作することを志向したタスク管理アプリ。

## 技術スタック

- **Electron** 41.0.0
- **React** 18 + **TypeScript** 5
- **electron-vite** 3.1.0（ビルドツール）

## プロジェクト構成

```
src/
├── main/index.ts         # Electronメインプロセス
├── preload/index.ts      # プリロードスクリプト（contextBridge）
└── renderer/
    ├── index.html
    └── src/
        ├── main.tsx      # Reactエントリーポイント
        ├── App.tsx       # ルートコンポーネント
        └── index.css
```

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # プロダクションビルド
npm run typecheck  # 型チェック
```

## 開発方針

- データはローカルに保存する（外部サービス依存なし）
- 仕様駆動開発にOpenSpecを使用（`/opsx:propose` で機能提案から始める）

## OpenSpec

変更管理は `openspec/` ディレクトリで管理。
新機能追加は `/opsx:propose "機能名"` から始める。

## ブランチ・バージョン管理ルール

> **AI向け強制ルール**: 以下に違反する操作を依頼された場合、1回必ず止めて確認すること。

### ブランチ構成

| ブランチ | 用途 | バージョン形式 |
|----------|------|--------------|
| `feature/*` | 機能開発 | — |
| `develop` | 統合・ベータリリース | `X.Y.Z-beta.N` |
| `master` | 安定版リリース | `X.Y.Z` |

### ワークフローの自動動作

- `develop` push → **Release (Beta)** が発火（ベータビルドを公開）
- `master` push → **Release (Stable)** が発火（安定版ビルドを公開）
- `master` push → **Auto Bump Beta** が発火（`develop` のバージョンを `X.Y.Z+1-beta.1` に自動更新）

### マージルール

**feature → develop**
- `package.json` のバージョンは `X.Y.Z-beta.N` 形式であること（Auto Bump が自動管理）

**develop → master（リリース時）**
1. `package.json` のバージョンを `X.Y.Z-beta.N` → `X.Y.Z`（stable）に手動で上げる
2. PR を作成してマージする
3. マージ後、Auto Bump が自動で `develop` を `X.Y.(Z+1)-beta.1` に上げる（何もしなくてよい）

### 禁止事項

- ❌ `package.json` が `-beta` のまま master へマージする
- ❌ master へ直接 push する（必ずPR経由）

## コミットメッセージ規約

フォーマット: `<emoji> <type>: <説明>`

**仕様 (Spec)**
- `📋 spec:` — 提案・仕様・設計ドキュメントの追加・更新
- `✅ tasks:` — タスクリストの更新・完了

**実装 (Impl)**
- `✨ feat:` — 新機能の追加
- `🐛 fix:` — バグ修正
- `♻️ refactor:` — 動作を変えないリファクタリング
- `💄 style:` — UIスタイルの変更
- `🔧 chore:` — ビルド設定・依存関係の変更
- `📝 docs:` — ドキュメントの変更
- `🎉 init:` — 初回コミット・初期セットアップ
