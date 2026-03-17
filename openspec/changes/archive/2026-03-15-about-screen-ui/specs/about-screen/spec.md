## ADDED Requirements

### Requirement: About モーダルをナビゲーションから開ける
ナビゲーションバーに About リンクを設置し、クリックすると About モーダルが開く SHALL。

#### Scenario: ナビゲーションの About リンクをクリックするとモーダルが開く
- **WHEN** ユーザーがナビゲーションバーの About リンクまたはアイコンをクリックする
- **THEN** About モーダルダイアログが表示される

#### Scenario: モーダルを閉じると元の画面に戻る
- **WHEN** ユーザーが About モーダルを閉じる（閉じるボタンまたは背景クリック）
- **THEN** About モーダルが閉じ、元の画面がそのまま表示される

### Requirement: About モーダルにアプリ名とバージョンを表示する
About モーダルにはアプリ名（Laurel）と現在のバージョン番号を表示する SHALL。バージョンは `package.json` の `version` フィールドの値を使用する。

#### Scenario: アプリ名とバージョンが表示される
- **WHEN** ユーザーが About モーダルを開く
- **THEN** アプリ名「Laurel」と `package.json` のバージョン番号が表示される

### Requirement: About モーダルにライセンス情報を表示する
About モーダルには MIT ライセンスであることと著作権表示を表示する SHALL。

#### Scenario: ライセンス情報が表示される
- **WHEN** ユーザーが About モーダルを開く
- **THEN** 「MIT License」の表記と著作権表示が表示される

### Requirement: About モーダルにプライバシー情報を表示する
About モーダルには「外部にデータを送信しない」旨のプライバシー情報を表示する SHALL。

#### Scenario: プライバシー情報が表示される
- **WHEN** ユーザーが About モーダルを開く
- **THEN** ユーザーデータが外部サーバーに送信されないことが明示されている