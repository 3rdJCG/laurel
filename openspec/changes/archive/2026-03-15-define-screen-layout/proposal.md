## Why

現在 Laurel にはアプリ画面の構成仕様が定義されていない。開発を進めるにあたってユーザーが何をどこで操作できるかを明確にし、実装の指針とするために画面構成を仕様化する。

## What Changes

- Home 画面を定義する（プロジェクト一覧・プロジェクト追加・タスク新規追加とプロジェクト分類）
- プロジェクト画面を定義する（プロジェクトに属するタスク一覧表示）
- 画面間のナビゲーション構造を定義する（Home ↔ 各プロジェクト）

## Capabilities

### New Capabilities

- `home-screen`: Home 画面の機能（プロジェクト追加・タスク作成とプロジェクトへの分類）
- `project-screen`: プロジェクト画面の機能（タスク一覧表示）
- `navigation`: 画面間のナビゲーション構造

### Modified Capabilities

（なし）

## Impact

- `src/renderer/src/App.tsx` にルーティング・ナビゲーション構造を追加
- `src/renderer/src/` 配下に Home・Project 各画面コンポーネントを新設
- データモデル（Project・Task）の型定義を追加