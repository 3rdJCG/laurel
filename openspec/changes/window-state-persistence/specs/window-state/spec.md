## ADDED Requirements

### Requirement: ウィンドウ状態の保存
アプリ終了時にメインウィンドウのサイズ（`width`, `height`）と位置（`x`, `y`）を `userData/window-state.json` に保存しなければならない（SHALL）。最大化・フルスクリーン状態は保存対象外とする。

#### Scenario: 通常終了時に保存される
- **WHEN** ユーザーがアプリを閉じる
- **THEN** 現在のウィンドウの `width`, `height`, `x`, `y` が `userData/window-state.json` に書き込まれる

#### Scenario: クラッシュ時は保存されない
- **WHEN** アプリがクラッシュまたは強制終了する
- **THEN** `close` イベントが発火しないため保存は行われない（許容動作）

### Requirement: ウィンドウ状態の復元
アプリ起動時に `userData/window-state.json` が存在すれば、その値を `BrowserWindow` の初期サイズ・位置として使用しなければならない（SHALL）。

#### Scenario: 保存済み状態で起動する
- **WHEN** `window-state.json` が存在し内容が有効な場合
- **THEN** 前回のウィンドウサイズと位置でウィンドウが生成される

#### Scenario: 初回起動（ファイル未存在）
- **WHEN** `window-state.json` が存在しない
- **THEN** デフォルト値（`width: 900, height: 670`、位置はシステム任せ）でウィンドウが生成される

#### Scenario: ファイルが破損している
- **WHEN** `window-state.json` が存在するが JSON パースに失敗する
- **THEN** デフォルト値でウィンドウが生成される（エラーはログ出力してアプリは正常起動する）

### Requirement: 画面外への復元防止
復元するウィンドウ位置が現在の表示領域外となる場合、位置をリセットしてウィンドウが画面内に収まるよう保証しなければならない（SHALL）。

#### Scenario: モニターを外した後の起動
- **WHEN** 保存時より少ないモニター構成で起動し、保存済み `x/y` がすべての表示領域の外にある
- **THEN** `x/y` を省略（またはプライマリモニター中央）にリセットしてウィンドウを生成する
- **THEN** 保存済みの `width/height` はそのまま適用される