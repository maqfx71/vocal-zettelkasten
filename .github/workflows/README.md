# GitHub Actions ワークフロー

このディレクトリには、プロジェクトで使用するGitHub Actionsワークフローファイルが含まれています。

## ワークフロー一覧

### CI (ci.yml)
- **トリガー**: `main`/`develop`ブランチへのPRまたはpush
- **内容**: PlaywrightによるE2Eテストを実行

### CD (cd.yml)
- **トリガー**: `main`ブランチへのpush
- **内容**: Vercelへの自動デプロイ

### AI Code Review (ai-review.yml)
- **トリガー**: `main`/`develop`ブランチへのPR作成・更新
- **内容**: OpenAI APIを使用した自動コードレビュー
- **必要なシークレット**: `OPENAI_API_KEY`

### Cursor Code Review (cursor-review.yml)
- **トリガー**: PRに`cursor-review`ラベルが付与されたとき
- **内容**: Cursor CLIエージェントを使用した自動コードレビュー
- **必要なシークレット**: `CURSOR_API_KEY`

## AI Code Review の設定

### 1. GitHub Secretsの設定

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」に移動
2. 「New repository secret」をクリック
3. 以下の情報を入力：
   - **Name**: `OPENAI_API_KEY`
   - **Secret**: あなたのOpenAI APIキー

### 2. 動作確認

PRを作成すると、自動的にAIレビューが実行されます。レビュー結果はPRのコメントとして投稿されます。

### 3. ローカルでの実行

ローカルでPRをレビューする場合は、`review-pr.js`スクリプトを使用できます：

```bash
# 環境変数を設定
export OPENAI_API_KEY="your-api-key"

# PRをレビュー
node review-pr.js <owner> <repo> <pr-number>

# 例
node review-pr.js qureshiagile vocal-zettelkasten 1
```

レビュー結果は`review-pr-<pr-number>.md`ファイルに保存されます。

## Cursor Code Review の設定

### 1. GitHub Secretsの設定

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」に移動
2. 「New repository secret」をクリック
3. 以下の情報を入力：
   - **Name**: `CURSOR_API_KEY`
   - **Secret**: あなたのCursor APIキー

### 2. 使用方法

1. PRに`cursor-review`ラベルを付与する
2. 自動的にCursor CLIエージェントがレビューを実行します
3. レビュー結果はPRのコメントとして投稿されます

### 3. ローカルでの実行

ローカルでPRをレビューする場合は、`cursor-review-pr.sh`スクリプトを使用できます：

```bash
# APIキーを設定（任意）
export CURSOR_API_KEY="your-api-key"

# PRをレビュー
./cursor-review-pr.sh <owner> <repo> <pr-number>

# 例
./cursor-review-pr.sh maqfx71 vocal-zettelkasten 1
```

レビュー結果は`review-pr-<pr-number>-cursor.md`ファイルに保存されます。

詳細は[README-CURSOR-REVIEW.md](../../README-CURSOR-REVIEW.md)を参照してください。

## レビューの観点

AIレビューでは以下の観点からコードをレビューします：

1. **コード品質**: 可読性、保守性、ベストプラクティスの遵守
2. **バグ・エラー**: 潜在的なバグ、エラーハンドリング、エッジケース
3. **パフォーマンス**: パフォーマンスの問題、不要な再レンダリング、メモリリーク
4. **セキュリティ**: セキュリティリスク、データ漏洩、XSS、CSRF対策
5. **テスト**: テストの必要性、テストカバレッジ
6. **設計**: アーキテクチャ、設計パターン、責任分離
7. **ドキュメント**: コメント、README、型定義の必要性

