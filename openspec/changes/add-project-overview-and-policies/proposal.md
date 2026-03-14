## Why

Laurel はオープンソースとして公開予定だが、ライセンス・プライバシーポリシー・利用規約などの基本的な文書が存在しない。ユーザーが安心して利用・貢献できる環境を整えるため、これらのドキュメント整備と関連コード上の保証が必要。

## What Changes

- `LICENSE` ファイルを MITライセンスで追加
- `README.md` にプロジェクト概要・機能説明・開発方法・ライセンス情報を追加
- プライバシーポリシー文書を追加（外部への情報送信がないことを明記）
- アプリ内にプライバシー保護を示すUI要素（フッター/About画面）を追加
- 外部ネットワーク通信を行わないことをコードレベルで保証（Electron の CSP 設定強化）

## Capabilities

### New Capabilities

- `project-documentation`: プロジェクトの概要・規約・ライセンス・プライバシーポリシーを文書化する
- `privacy-guarantee`: ユーザーデータを外部に送信せず、ローカルのみで動作することをコード・UI両面で保証する

### Modified Capabilities

（なし）

## Impact

- 新規ファイル: `LICENSE`, `README.md`, `docs/PRIVACY.md`
- Electron メインプロセスの CSP (Content Security Policy) 設定
- レンダラーに About/プライバシー情報の表示コンポーネント追加