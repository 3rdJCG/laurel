## MODIFIED Requirements

### Requirement: 画面遷移の管理
アプリケーションはサイドバーを通じて Home 画面・各プロジェクト画面・設定モーダル・About モーダルへの遷移を管理する SHALL。

#### Scenario: サイドバーから Home 画面へ遷移する
- **WHEN** ユーザーがサイドバーの Home 項目をクリックする
- **THEN** Home 画面が表示される

#### Scenario: サイドバーからプロジェクト画面へ遷移する
- **WHEN** ユーザーがサイドバーのプロジェクト項目をクリックする
- **THEN** 選択したプロジェクトの画面が表示される

#### Scenario: Home 画面からプロジェクト画面へ遷移する
- **WHEN** ユーザーが Home 画面でプロジェクトを選択する
- **THEN** 選択したプロジェクトの画面が表示される

#### Scenario: サイドバーから Settings モーダルを開く
- **WHEN** ユーザーがサイドバーの Settings 項目をクリックする
- **THEN** 設定モーダルが開く

#### Scenario: サイドバーから About モーダルを開く
- **WHEN** ユーザーがサイドバーの About 項目をクリックする
- **THEN** About モーダルが開く