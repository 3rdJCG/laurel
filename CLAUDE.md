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
