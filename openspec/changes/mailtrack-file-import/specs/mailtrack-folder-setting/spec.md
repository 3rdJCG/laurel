## ADDED Requirements

### Requirement: 設定画面で mailtrack フォルダを指定できる
ユーザーは設定画面から mailtrack JSON ファイルが出力されるフォルダを指定できる SHALL。

#### Scenario: フォルダを選択して保存する
- **WHEN** ユーザーが設定画面の「mailtrack フォルダ」セクションで「フォルダを選択」をクリックする
- **THEN** OS のフォルダ選択ダイアログが開く
- **WHEN** ユーザーがフォルダを選択して「変更を保存」をクリックする
- **THEN** 選択したパスが `mailtrackDir` として設定に保存される
- **AND** 設定画面に選択したパスが表示される

#### Scenario: mailtrackDir が未設定の状態で設定画面を開く
- **WHEN** mailtrack フォルダが設定されていない状態で設定画面を開く
- **THEN** mailtrack フォルダ欄に「未設定」と表示される

#### Scenario: mailtrackDir をクリアする
- **WHEN** ユーザーが「クリア」ボタンをクリックして「変更を保存」をクリックする
- **THEN** `mailtrackDir` が `null` に設定される
- **AND** 設定画面のフォルダ欄が「未設定」に戻る

### Requirement: mailtrackDir はアプリ再起動後も保持される
指定した mailtrack フォルダパスはアプリを再起動しても保持される SHALL。

#### Scenario: アプリを再起動した後に設定が保持されている
- **GIVEN** mailtrack フォルダを設定して保存した
- **WHEN** アプリを再起動する
- **THEN** 設定画面に同じフォルダパスが表示される
- **AND** Forge Today 画面で同フォルダのファイルが読み込まれる
