## 1. ライセンス・ドキュメント整備

- [x] 1.1 `LICENSE` ファイルを MIT ライセンスで作成（著作権者名・年を記入）
- [x] 1.2 `README.md` を作成（概要・機能・インストール手順・開発手順・ライセンス）
- [x] 1.3 `docs/PRIVACY.md` を作成（収集情報なし・外部送信なし・ローカル保存のみを明記）

## 2. CSP 設定モジュールの実装

- [x] 2.1 `src/main/csp.ts` を作成し、CSP ディレクティブを一元管理する関数を定義
- [x] 2.2 デフォルトの CSP を `connect-src 'none'` を含む安全な設定にする
- [x] 2.3 `src/main/index.ts` で `csp.ts` を使用し、`session.defaultSession.webRequest` に CSP を適用
- [x] 2.4 開発環境（`isDev`）では CSP を緩和し、開発ツールが動作するよう分岐させる
- [x] 2.5 動作確認: 本番ビルドで外部 URL への fetch がブロックされることを確認

## 3. アプリ内 About UI の実装

- [x] 3.1 `src/renderer/src/components/About.tsx` を作成（ライセンス情報・プライバシー方針を表示）
- [x] 3.2 App.tsx またはレイアウトコンポーネントから About 画面へのアクセス手段を追加（メニューまたはフッター）
- [x] 3.3 About 画面の表示内容が `docs/PRIVACY.md` と整合していることを確認