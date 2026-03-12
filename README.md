# Laurel

ローカルで動作するタスク管理アプリ。

## 技術スタック

- Electron 41
- React 18 + TypeScript 5
- electron-vite 3

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build        # プロダクションビルド
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## コミットメッセージ規約

フォーマット: `<emoji> <type>: <説明>`

### 仕様 (Spec)

| Emoji | Type | 用途 |
|---|---|---|
| 📋 | `spec` | 提案・仕様・設計ドキュメントの追加・更新 |
| ✅ | `tasks` | タスクリストの更新・完了 |

### 実装 (Impl)

| Emoji | Type | 用途 |
|---|---|---|
| ✨ | `feat` | 新機能の追加 |
| 🐛 | `fix` | バグ修正 |
| ♻️ | `refactor` | 動作を変えないリファクタリング |
| 💄 | `style` | UIスタイルの変更 |
| 🔧 | `chore` | ビルド設定・依存関係の変更 |
| 📝 | `docs` | ドキュメントの変更 |
| 🎉 | `init` | 初回コミット・初期セットアップ |

### 例

```
✨ feat: タスク作成機能を追加
🐛 fix: 完了済みタスクが消えないバグを修正
📋 spec: タスク編集機能の仕様を追加
✅ tasks: タスク作成機能のタスクを完了
🔧 chore: electron を 41.0.0 に更新
```
