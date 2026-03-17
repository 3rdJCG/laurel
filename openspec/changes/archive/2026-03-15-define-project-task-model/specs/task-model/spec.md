## ADDED Requirements

### Requirement: Task の識別子は時系列ソート可能である
Task の `id` は ULID 形式であり、辞書順ソートで作成時系列順になる SHALL。

#### Scenario: 複数 Task を作成順にソートできる
- **WHEN** 複数の Task が作成される
- **THEN** `id` の辞書順ソートで作成順に並べることができる

### Requirement: Task 名は任意に設定できる
Task 作成時にユーザーが任意のタスク名を設定できる SHALL。

#### Scenario: タスク名を設定して作成する
- **WHEN** ユーザーが任意の文字列を Task 名として入力し作成する
- **THEN** 入力した名前が Task の `title` フィールドに保存される

### Requirement: Task はステータスを持つ
Task は `status` フィールドを持ち、`todo` / `in-progress` / `in-review` / `done` のいずれかの値を取る SHALL。初期値は `todo`。

#### Scenario: Task 作成時のステータスは todo である
- **WHEN** Task が作成される
- **THEN** `status` の初期値が `todo` に設定される

#### Scenario: Task のステータスを変更できる
- **WHEN** ユーザーが Task のステータスを変更する
- **THEN** `status` が指定した値（`in-progress` / `in-review` / `done` のいずれか）に更新される

### Requirement: Task は親子の階層構造を持てる
Task は `parentId` によって親タスクを参照でき、最大5層の階層構造を形成できる SHALL。

#### Scenario: ルートタスクは parentId が null である
- **WHEN** 親を持たない Task が作成される
- **THEN** `parentId` が `null` に設定される

#### Scenario: 子タスクは親タスクの id を参照する
- **WHEN** 既存 Task の子タスクが作成される
- **THEN** `parentId` に親 Task の `id` が設定される

#### Scenario: 6層目の子タスク作成はブロックされる
- **WHEN** 第5層の Task に子タスクを追加しようとする
- **THEN** 操作がブロックされ、タスクは作成されない

### Requirement: Task はジャンルを持てる
Task は任意のジャンル（カテゴリ）を `genre` フィールドに設定できる SHALL。未設定の場合は `null`。

#### Scenario: ジャンルを設定して Task を作成する
- **WHEN** ユーザーがジャンルを指定して Task を作成する
- **THEN** `genre` に指定した文字列が設定される

#### Scenario: ジャンルなしで Task を作成できる
- **WHEN** ユーザーがジャンルを指定せず Task を作成する
- **THEN** `genre` が `null` に設定される

### Requirement: Task はタグを複数持てる
Task は任意のタグを `tags` フィールドに複数設定できる SHALL。未設定の場合は空配列。

#### Scenario: タグを設定して Task を作成する
- **WHEN** ユーザーが1つ以上のタグを指定して Task を作成する
- **THEN** `tags` に指定したタグの配列が設定される

### Requirement: 子 Task 作成時にジャンル・タグは親から任意継承される
子 Task 作成時、親 Task の `genre` と `tags` がデフォルト値として引き継がれる SHALL。子 Task 側で上書き可能。

#### Scenario: 子タスク作成時に親のジャンル・タグが初期値になる
- **WHEN** ジャンル・タグを持つ親 Task に子 Task を追加する
- **THEN** 子 Task の `genre`・`tags` の初期値に親の値が設定される

#### Scenario: 子タスクのジャンル・タグを親と異なる値に変更できる
- **WHEN** ユーザーが子 Task のジャンル・タグを変更する
- **THEN** 子 Task の `genre`・`tags` が変更され、親 Task の値には影響しない

### Requirement: Task は所属 Project を持つ
Task は必ず1つの Project に属し、`projectId` フィールドで参照する SHALL。

#### Scenario: Task 作成時に projectId が設定される
- **WHEN** Task が作成される
- **THEN** `projectId` に所属 Project の `id` が設定される