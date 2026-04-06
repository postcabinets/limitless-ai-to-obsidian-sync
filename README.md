# limitless-ai-to-obsidian-sync

**Limitless AI Pendant → Obsidian vault 自動キャプチャ（GitHub Actions）**

Limitless AI Pendant が記録したすべてのセッションを自動的に Obsidian vault の `captures/` フォルダに保存し、GitHub に同期します。

## 概要

```
Limitless AI Pendant
    ↓ (毎日 09:30 JST に自動実行)
GitHub Actions
    ↓
Limitless API: /v1/lifelogs + /v1/chats
    ↓
Markdown 生成（frontmatter 付き）
    ↓
obsidian-vault/captures/YYYY-MM-DD/session-YYYY-MM-DD.md
    ↓
GitHub に自動 push
```

## セットアップ

### Step 1: Limitless API Key 取得

1. https://www.limitless.ai に ログイン
2. Developer Settings → Create API Key
3. API Key をコピー

### Step 2: GitHub Secrets 設定

このリポ（`limitless-ai-to-obsidian-sync`）の Settings → Secrets に追加：

**Secret 名:** `LIMITLESS_API_KEY`
**値:** Limitless のAPI Key

### Step 3: Obsidian Vault リポ確認

別リポ `postcabinets/obsidian-vault` が GitHub に存在することを確認：
- https://github.com/postcabinets/obsidian-vault

存在しない場合は作成：
```bash
gh repo create obsidian-vault --public
```

## 使用方法

### 自動実行（毎日 09:30 JST）

GitHub Actions が毎日自動的に実行されます。

確認方法：
1. https://github.com/postcabinets/limitless-ai-to-obsidian-sync/actions
2. "Daily Limitless AI → Obsidian Sync" ワークフローの実行状況を確認

### 手動実行

```bash
# スクリプト直接実行
LIMITLESS_API_KEY=your_api_key npm run sync

# または GitHub Actions で手動トリガー
# Actions → "Daily Limitless AI → Obsidian Sync" → "Run workflow"
```

## 生成ファイル形式

### ファイル名
```
obsidian-vault/captures/2026-04-07/session-2026-04-07.md
```

### Frontmatter
```yaml
---
type: limitless-capture
date: 2026-04-07
session: pendant-sync-2026-04-07
duration: 120
source: limitless-ai-pendant
filtered: false
participants: []
---
```

### コンテンツ

```markdown
# Limitless AI キャプチャ（2026-04-07）

## 記録内容

### Pendant 記録

#### 1. 朝礼
**時間:** 09:00:00 - 09:45:00

ノブ: 「今日の目標は...」

田中さん: 「市場動向について...」

---

## Ask AI チャット

### チャット 1: 議論の要点
**作成:** 2026-04-07 10:30:00

**Q:** 昨日の会議で何が決まった？

**A:** Q2 予算が 150万に決定され、MVP 完成は 5月末とされました。
```

## パイプライン統合

このスクリプトの出力は、`limitless-ai-processor` スキルへ自動的に入力されます：

```
Limitless AI Pendant
    ↓ [このスキル]
captures/ → GitHub
    ↓
limitless-ai-processor
    ↓
filtered/goals/, insights/, reference/
    ↓
GitHub に自動 push
    ↓
OpenClaw が GitHub API で読む
```

## トラブルシューティング

### GitHub Actions がフェイル

1. **Secret が設定されていない**
   - 設定確認: Settings → Secrets and variables → Actions
   - `LIMITLESS_API_KEY` が存在するか確認

2. **obsidian-vault リポが見つからない**
   - https://github.com/postcabinets/obsidian-vault が存在するか確認
   - リポが private の場合、`GITHUB_TOKEN` をワークフロー内で使用

3. **API Key が無効**
   - Limitless.ai → Developer Settings で API Key を確認
   - Key をリジェネレートして再度 Secret に設定

### スクリプト実行エラー

```bash
# API Key をテスト
curl -H "X-API-Key: YOUR_API_KEY" https://api.limitless.ai/v1/lifelogs?date=2026-04-07

# スクリプトをローカルで実行
LIMITLESS_API_KEY=your_key VAULT_REPO_PATH=./vault npm run sync
```

## 環境変数

| 変数 | 必須 | デフォルト | 説明 |
|-----|------|---------|------|
| `LIMITLESS_API_KEY` | ✅ | なし | Limitless API キー |
| `VAULT_REPO_PATH` | ❌ | `./vault` | Obsidian vault のパス |
| `VAULT_URL` | ❌ | `https://github.com/postcabinets/obsidian-vault.git` | Vault リポ URL |

## スケジュール

- **実行時刻:** 毎日 09:30 JST（00:30 UTC）
- **取得範囲:** 前日のデータ（タイムゾーン: Asia/Tokyo）
- **レート制限:** Limitless API 180 req/min（余裕あり）

## 開発

```bash
# 依存関係なし（Node.js のみ使用）

# ローカルテスト
LIMITLESS_API_KEY=test_key npm run sync

# ワークフロー手動トリガー
gh workflow run daily-sync.yml
```

## ライセンス

MIT

---

**作成:** 2026-04-06
**最終更新:** 2026-04-06
