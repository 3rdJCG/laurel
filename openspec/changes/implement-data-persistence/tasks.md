## 1. 依存ライブラリの追加

- [ ] 1.1 `npm install chokidar` で chokidar を追加する

## 2. メインプロセス: storage モジュールの実装

- [ ] 2.1 `src/main/storage/` ディレクトリを作成する
- [ ] 2.2 `src/main/storage/settings.ts` を実装する（`<userData>/laurel/settings.json` の読み書き・デフォルトパスとして `<Documents>/laurel/` を返す）
- [ ] 2.3 `src/main/storage/projectStore.ts` を実装する（プロジェクトファイルの読み込み・保存・削除）
- [ ] 2.4 `src/main/storage/watcher.ts` を実装する（chokidar ポーリングモードによるディレクトリ監視・自己書き込み除外ロジック）
- [ ] 2.5 保存先変更時のウォッチャー再起動・既存データのコピーロジックを実装する

## 3. IPC ブリッジの実装

- [ ] 3.1 `src/main/index.ts` に IPC ハンドラーを追加する（`data:load-all`, `data:save-project`, `data:delete-project`, `settings:get`, `settings:set`）
- [ ] 3.2 外部変更検知時のレンダラーへの通知を実装する（`data:project-changed`, `data:project-added`, `data:project-removed`）
- [ ] 3.3 `src/preload/index.ts` に contextBridge 経由の API を追加する（invoke・on の両方）

## 4. レンダラー側の移行

- [ ] 4.1 アプリ起動時に `data:load-all` で初期データを取得するよう変更する
- [ ] 4.2 Project・Task の作成・更新・削除操作を IPC 経由の保存に切り替える
- [ ] 4.3 `data:project-changed` / `data:project-added` / `data:project-removed` イベントを受け取り状態を更新する

## 5. 動作確認

- [ ] 5.1 ローカル保存・アプリ再起動でデータが復元されることを確認する
- [ ] 5.2 別エディタでプロジェクトファイルを編集し、アプリへの即時反映（1秒以内）を確認する
- [ ] 5.3 カスタム保存先への変更・アクセス失敗時のフォールバック動作を確認する
- [ ] 5.4 `npm run typecheck` でエラーがないことを確認する