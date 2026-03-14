## ADDED Requirements

### Requirement: CSP による外部通信の遮断
アプリケーションは Content Security Policy により、デフォルトで外部ネットワーク通信を技術的に遮断する SHALL。

#### Scenario: 外部 URL への fetch が失敗する
- **WHEN** レンダラープロセスが外部 URL（例: `https://example.com`）へ fetch を試みる
- **THEN** CSP 違反としてブロックされ、通信は行われない

#### Scenario: CSP 設定が本番環境で有効である
- **WHEN** アプリケーションが本番モードで起動する
- **THEN** `connect-src 'none'` が適用されている

### Requirement: CSP 設定の拡張可能な構造
CSP 設定は `src/main/csp.ts` に集約し、将来の外部通信機能追加に対して局所的な変更で対応できる SHALL。

#### Scenario: CSP 設定が一元管理されている
- **WHEN** 開発者が CSP の許可オリジンを変更したい
- **THEN** `src/main/csp.ts` の一箇所を変更するだけで全体に反映される

### Requirement: アプリ内でのプライバシー情報の表示
アプリケーション内の About 画面または常時表示される UI 要素で、プライバシー保護の状態をユーザーに提示する SHALL。

#### Scenario: プライバシー情報がアプリ内で確認できる
- **WHEN** ユーザーがアプリ内の About 画面またはフッターを参照する
- **THEN** 「外部にデータを送信しない」旨と MIT ライセンス情報が表示される