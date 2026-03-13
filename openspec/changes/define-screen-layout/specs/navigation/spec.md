## ADDED Requirements

### Requirement: 画面遷移の管理
アプリケーションは Home 画面と各プロジェクト画面の間の遷移を管理する SHALL。

#### Scenario: Home からプロジェクト画面へ遷移する
- **WHEN** ユーザーが Home 画面でプロジェクトを選択する
- **THEN** 選択したプロジェクトの画面が表示される

#### Scenario: プロジェクト画面から Home へ戻る
- **WHEN** ユーザーがプロジェクト画面でナビゲーション操作を行う
- **THEN** Home 画面が表示される