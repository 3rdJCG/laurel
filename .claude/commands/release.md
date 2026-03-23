# Release Command

Laurel のリリース作業をガイドします。

## バージョン戦略

| ブランチ | バージョン形式 | 例 |
|---------|-------------|-----|
| develop | `x.y.z-beta.N` | `1.0.2-beta.3` |
| master  | `x.y.z`        | `1.0.2`        |

- develop は常に master の **次のパッチバージョン** の beta
- master へのマージ後、Actions が develop を自動で次の beta.1 に bump する

---

## リリース手順

**Step 1: version を stable に変更**

`package.json` の version から `-beta.N` を除去する。

例: `1.0.2-beta.3` → `1.0.2`

```bash
# 現在のバージョン確認
node -p "require('./package.json').version"
```

**Step 2: コミット & push**

```bash
git add package.json
git commit -m "🔧 chore: v1.0.2"
git push origin develop
```

**Step 3: PR 作成 → マージ**

```
/opsx:apply  # 実装タスクが残っていれば先に完了させる
```

PR を作成して master にマージ。
GitHub Actions の version-check が stable 形式かどうかを確認する。

**Step 4: （自動）develop の auto-bump**

master へのマージ後、develop に merge-back した際に Actions が自動で
`1.0.2` → `1.0.3-beta.1` に bump してコミットする。手動作業不要。

---

## Beta バージョンの bump

通常の開発中に beta 番号を上げたい場合:

```bash
# beta.1 → beta.2
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const v = pkg.version.replace(/-beta\.(\d+)$/, (_, n) => \`-beta.\${+n+1}\`);
  pkg.version = v;
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  console.log('Bumped to', v);
"
git add package.json && git commit -m "🔧 chore: vX.Y.Z-beta.N"
git push origin develop
```

---

## GitHub Actions

| ワークフロー | トリガー | 内容 |
|------------|---------|------|
| `release.yml` | master push | Windows インストーラをビルド → stable release 公開 |
| `release-beta.yml` | develop push | Windows インストーラをビルド → pre-release 公開 |
| `version-check.yml` | master への push/PR | stable 形式でなければ失敗 |
| `auto-bump-beta.yml` | develop push | stable 形式を検出したら自動で次の beta.1 に bump |

---

## チェックリスト

リリース前に確認:

- [ ] `npm run typecheck` が通る
- [ ] 手動動作確認済み
- [ ] OpenSpec のタスクがすべて完了している (`/opsx:apply`)
- [ ] CHANGELOG / リリースノートが必要なら記載した
