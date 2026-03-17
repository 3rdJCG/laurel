## ADDED Requirements

### Requirement: mailtrack ファイル自体への操作を禁止する
Laurel は mailtrack フォルダ内の JSON ファイルを読み取り専用として扱い、変更・削除・コピーなどの操作を一切行わない SHALL。

#### Scenario: メールをタスクに割り当てた後でも mailtrack ファイルは変更されない
- **WHEN** ユーザーが Forge Today 画面でメールをプロジェクトに割り当てる
- **THEN** 対応する mailtrack JSON ファイルの内容・タイムスタンプは変更されない
- **AND** mailtrack フォルダにファイルの追加・削除は行われない

#### Scenario: メールを破棄した後でも mailtrack ファイルは変更されない
- **WHEN** ユーザーが Forge Today 画面でメールを破棄する
- **THEN** 対応する mailtrack JSON ファイルの内容・タイムスタンプは変更されない

### Requirement: 処理済みファイルは Laurel の状態ファイルで管理する
mailtrack ファイルの処理済み状態は `<userData>/laurel/mailtrack-state.json` に保存する SHALL。

#### Scenario: メールを処理（割り当て or 破棄）すると状態ファイルが更新される
- **WHEN** ユーザーがメールを割り当てまたは破棄する
- **THEN** `<userData>/laurel/mailtrack-state.json` の `processedFiles` に当該ファイル名が追加される

#### Scenario: アプリ再起動後も処理済み状態が保持される
- **GIVEN** いくつかのメールを処理（割り当てまたは破棄）した
- **WHEN** アプリを再起動して Forge Today を開く
- **THEN** 処理済みのメールはカード一覧に表示されない

### Requirement: mailtrack フォルダに新しいファイルが追加された場合は未処理として扱う
`mailtrack-state.json` に記録されていないファイルは未処理とみなし、Forge Today 画面に表示する SHALL。

#### Scenario: 新しい mailtrack ファイルが追加された後に Forge Today を開く
- **GIVEN** いくつかのメールを処理済みにした後、mailtrack フォルダに新しい JSON ファイルが追加された
- **WHEN** ユーザーが Forge Today を開く（または再読み込みする）
- **THEN** 新しく追加されたファイルのみカードとして表示される
- **AND** 既に処理済みのファイルは表示されない
