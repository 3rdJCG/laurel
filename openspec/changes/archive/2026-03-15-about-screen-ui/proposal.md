## Why

`add-project-overview-and-policies` の `privacy-guarantee` スペックに「About 画面でプライバシー情報と MIT ライセンスを表示する SHALL」という要件があるが、About 画面自体のUI仕様（配置・内容・表示方法）が定義されていない。実装者が独自に実装すると要件との乖離が生じる。

## What Changes

- About 画面（またはモーダル）のUIとコンテンツ構成を定義する
- アプリ名・バージョン・ライセンス・プライバシー情報の表示仕様を定める
- About 画面へのアクセス導線（ナビゲーション）を定義する

## Capabilities

### New Capabilities

- `about-screen`: About 画面のUIコンテンツと表示方法の仕様

### Modified Capabilities

（なし）

## Impact

- ナビゲーションに About へのリンクまたはメニュー項目を追加
- `package.json` のバージョン情報を IPC 経由でレンダラーに渡す仕組みが必要
- `privacy-guarantee` スペック（`add-project-overview-and-policies`）の要件を満たす実装となる