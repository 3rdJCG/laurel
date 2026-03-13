## ADDED Requirements

### Requirement: 完了タスク表示トグル
Project 画面のタスクリスト上部に「完了タスクを表示／非表示」トグルボタンを配置する。初期状態は「表示」（`showCompletedTasks = true`）。状態はセッション中保持し、永続化はしない。

#### Scenario: 初期表示
- **WHEN** Project 画面を開く
- **THEN** `done` ステータスのタスクを含む全タスクが表示される
- **THEN** トグルボタンは「完了を隠す」状態（オン）として表示される

#### Scenario: 完了タスクを非表示にする
- **WHEN** ユーザーがトグルボタンをオフにする
- **THEN** `status === 'done'` のタスクがリストから非表示になる
- **THEN** `done` の親タスクの子タスクも非表示になる
- **THEN** トグルボタンは「完了を表示」状態（オフ）として表示される

#### Scenario: 完了タスクを再表示する
- **WHEN** 完了タスクが非表示の状態でトグルボタンをオンにする
- **THEN** `done` ステータスのタスクが再び表示される

#### Scenario: 完了タスクが存在しない場合
- **WHEN** Project に `done` タスクが一件もない
- **THEN** トグルボタンのオン／オフに関わらず表示件数に変化はない

### Requirement: 完了タスクフィルタリングロジック
`showCompletedTasks` が `false` のとき、タスクリストは `status === 'done'` のタスクおよびその子孫を除外してから描画する。

#### Scenario: ルートタスクが done
- **WHEN** `showCompletedTasks === false` かつルートタスクの `status` が `done`
- **THEN** そのルートタスクとその全子孫はリストに描画されない

#### Scenario: 中間タスクが done
- **WHEN** `showCompletedTasks === false` かつ深さ 2 以上のタスクの `status` が `done`
- **THEN** そのタスクとその子孫はリストに描画されない
- **THEN** その親タスクは引き続き表示される