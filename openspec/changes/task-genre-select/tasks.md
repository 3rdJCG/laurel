## 1. DataContext の更新

- [x] 1.1 `DataContext.tsx` に `Genre` 型の import と `genres: Genre[]` ステートを追加する
- [x] 1.2 `DataContext.tsx` の初期化処理で `settings:get` を呼び出し、`genres` を取得・設定する
- [x] 1.3 `DataContext.tsx` に `addGenre(name: string): Promise<void>` を実装する（デフォルト色 `#6b7280` で追加し `settings:genres-set` で保存）
- [x] 1.4 `DataContext` の `value` と `useData` の型に `genres` と `addGenre` を追加する

## 2. GenrePicker コンポーネントの作成

- [x] 2.1 `src/renderer/src/components/GenrePicker.tsx` を新規作成する（Props: `value`, `genres`, `onChange`, `onAddGenre`）
- [x] 2.2 現在の選択ジャンルを色スウォッチ付きで表示するトリガーボタンを実装する（未選択時は「ジャンルなし」と表示）
- [x] 2.3 ドロップダウンリスト（「ジャンルなし」オプション + 登録済みジャンル一覧 + 「+ 新しいジャンルを追加」）を実装する
- [x] 2.4 既存タスクのジャンルが登録リストにない場合、そのジャンルを末尾に追加して選択肢に含める
- [x] 2.5 「+ 新しいジャンルを追加」を選択するとドロップダウン内にインライン入力フォームを展開する
- [x] 2.6 新規ジャンル入力フォームで Enter または「追加」ボタンを押すと `onAddGenre` を呼び出し、そのジャンルを選択状態にする
- [x] 2.7 ドロップダウン外クリックで閉じる処理を実装する（`useRef` + `mousedown` イベント）

## 3. TaskItem の更新

- [x] 3.1 `TaskItem.tsx` で `useData` から `genres` と `addGenre` を取得する
- [x] 3.2 `TaskItem.tsx` のジャンル `<input type="text">` を `<GenrePicker>` に差し替える

## 4. スタイルの追加

- [x] 4.1 `index.css` に `.genre-picker` トリガーボタンのスタイルを追加する（色スウォッチ + テキスト + 矢印、横並び）
- [x] 4.2 `.genre-picker-dropdown` のスタイルを追加する（絶対配置、ドロップダウンリスト）
- [x] 4.3 `.genre-picker-option` のスタイルを追加する（色スウォッチ付きオプション行、ホバー状態）
- [x] 4.4 `.genre-picker-add-form` のスタイルを追加する（インライン入力フォーム行）

## 5. 動作確認

- [x] 5.1 `npm run typecheck` でエラーがないことを確認する
- [x] 5.2 タスク編集フォームのジャンル欄が登録済みジャンルのセレクト UI に変わっていることを確認する
- [x] 5.3 ドロップダウンから既存ジャンルを選択してタスクを保存し、ジャンルが正しく反映されることを確認する
- [x] 5.4 「+ 新しいジャンルを追加」からジャンル名を入力・登録すると、そのジャンルが選択され設定画面にも反映されることを確認する
- [x] 5.5 ドロップダウン外クリックでドロップダウンが閉じることを確認する
