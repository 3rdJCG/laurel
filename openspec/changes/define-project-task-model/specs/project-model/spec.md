## ADDED Requirements

### Requirement: Project の識別子は時系列ソート可能である
Project の `id` は ULID 形式であり、辞書順ソートで作成時系列順になる SHALL。

#### Scenario: 複数 Project を作成順にソートできる
- **WHEN** 複数の Project が作成される
- **THEN** `id` の辞書順ソートで作成順に並べることができる

### Requirement: Project 名は任意に設定できる
Project 作成時にユーザーが任意のプロジェクト名を設定できる SHALL。

#### Scenario: プロジェクト名を設定して作成する
- **WHEN** ユーザーが任意の文字列を Project 名として入力し作成する
- **THEN** 入力した名前が Project の `name` フィールドに保存される

### Requirement: Project は作成日時を保持する
Project は作成日時を ISO 8601 文字列として保持する SHALL。

#### Scenario: Project 作成時に createdAt が設定される
- **WHEN** Project が作成される
- **THEN** `createdAt` に作成時点の ISO 8601 日時文字列が設定される