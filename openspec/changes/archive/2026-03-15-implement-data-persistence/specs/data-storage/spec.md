## ADDED Requirements

### Requirement: Project データはプロジェクトごとに独立したファイルに保存される
各 Project のデータ（Project メタデータ + その Task 一覧）は `<保存先>/laurel/<project-id>.json` に保存される SHALL。

#### Scenario: Project を作成するとファイルが生成される
- **WHEN** ユーザーが新しい Project を作成する
- **THEN** `<保存先>/laurel/<project-ulid>.json` ファイルが作成され、Project メタデータと空の Task 一覧が書き込まれる

#### Scenario: Task を追加するとプロジェクトファイルが更新される
- **WHEN** ユーザーが Project に Task を追加する
- **THEN** 該当プロジェクトの JSON ファイルの `tasks` 配列が更新される

#### Scenario: Project を削除するとファイルが削除される
- **WHEN** ユーザーが Project を削除する
- **THEN** 対応する `<project-ulid>.json` ファイルが削除される

### Requirement: アプリ起動時に全プロジェクトファイルを読み込む
アプリ起動時、保存先の `laurel/` ディレクトリに存在するすべての `*.json` ファイルを読み込み、データを復元する SHALL。

#### Scenario: 保存済みデータがある状態でアプリを起動する
- **WHEN** アプリを終了後に再起動する
- **THEN** 終了前と同じ Project・Task データが表示される

#### Scenario: 保存先ディレクトリが存在しない場合に起動する
- **WHEN** 保存先の `laurel/` ディレクトリが存在しない状態でアプリを起動する
- **THEN** ディレクトリが自動作成され、空の状態でアプリが起動する

### Requirement: データファイルはバージョンフィールドを持つ
各プロジェクトファイルは `version` フィールドを持ち、将来のスキーマ変更に対応できる SHALL。

#### Scenario: 新規作成したプロジェクトファイルに version が含まれる
- **WHEN** Project が作成されてファイルが生成される
- **THEN** ファイルに `"version": 1` フィールドが含まれる