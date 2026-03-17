## Why

`define-screen-layout` の `navigation` スペックは Home ↔ Project の遷移のみを定義している。その後 `settings-screen-ui`・`about-screen-ui` が追加されたが、Settings・About への導線が navigation スペックに反映されておらず、実装者がナビゲーション全体のUIを設計できない状態になっている。

また現状の「プロジェクト画面から Home に戻る」というフローは、プロジェクトが複数ある場合に切り替えコストが高い。左サイドバーによるタブ型ナビゲーションで全画面への直接アクセスを可能にする。

## What Changes

- 左側に折りたたみ可能なサイドバーを追加し、Home・各プロジェクト・Settings を選択できるようにする
- サイドバーはハンバーガーボタンで開閉でき、閉じた状態ではアイコンのみの最小幅表示になる
- About はサイドバー下部のアイコンボタンから開く（既存の `about-screen-ui` と合わせる）
- `navigation` スペックを MODIFIED として更新し、サイドバー中心のナビゲーションモデルに変更する

## Capabilities

### New Capabilities

- `collapsible-sidebar`: 折りたたみ可能な左サイドバーナビゲーションコンポーネント

### Modified Capabilities

- `navigation`: Home ↔ Project の2画面遷移から、サイドバーを軸とした全画面ナビゲーションモデルに更新

## Impact

- `App.tsx` のルーティング・状態管理の変更が必要
- `define-screen-layout` で定義した「プロジェクト画面から Home へ戻る」ナビゲーション要件が置き換わる
- `about-screen-ui` の「ナビゲーションバーに About リンクを設置」と整合させる（サイドバーのフッターに配置）
- `settings-screen-ui` の設定モーダルを開くトリガーをサイドバーに統合する