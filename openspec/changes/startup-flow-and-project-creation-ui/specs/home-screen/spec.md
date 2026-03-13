## REMOVED Requirements

### Requirement: タスクの新規追加とプロジェクトへの分類
**Reason**: タスク追加の責務を Project 画面（`project-root-task-creation-ui`）に統一するため削除。Home 画面でのタスク追加にはプロジェクト選択 UI が必要で実装コストが高く、MVP 段階では Project 画面経由のフローに絞る。将来的に必要になった場合は別 Change として追加する。
**Migration**: タスクを追加するには、Home 画面からプロジェクトを選択して Project 画面に遷移し、「＋ タスクを追加」ボタンを使用する。