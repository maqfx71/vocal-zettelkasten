# Cursor CLI エージェントでのPRレビュー

Cursor CLIのエージェント機能を使用して、GitHub Pull Requestをレビューする方法です。

## セットアップ

### 1. Cursor CLIのインストール

```bash
# macOS/Linux
curl https://cursor.sh/install | sh

# Windows (PowerShell)
curl -fsSL https://cursor.sh/install.ps1 | powershell
```

### 2. 認証

Cursor CLIにログインします：

```bash
cursor agent login
```

または、APIキーを環境変数に設定：

```bash
export CURSOR_API_KEY='your-api-key'
```

## 使用方法

### 基本的な使い方

```bash
./cursor-review-pr.sh <owner> <repo> <pr-number>

# 例
./cursor-review-pr.sh qureshiagile vocal-zettelkasten 1
```

### 直接Cursorエージェントを使用する場合

```bash
cursor agent "以下のGitHub PRをレビューしてください: https://github.com/qureshiagile/vocal-zettelkasten/pull/1"
```

### 非対話モード（スクリプト実行用）

環境変数 `CURSOR_API_KEY` を設定すると、非対話モードで実行できます：

```bash
export CURSOR_API_KEY='your-api-key'
./cursor-review-pr.sh qureshiagile vocal-zettelkasten 1
```

結果は `review-pr-<pr-number>-cursor.md` に保存されます。

## レビューの観点

Cursorエージェントは以下の観点からコードをレビューします：

1. **コード品質**: 可読性、保守性、ベストプラクティスの遵守
2. **バグ・エラー**: 潜在的なバグ、エラーハンドリング、エッジケース
3. **パフォーマンス**: パフォーマンスの問題、不要な再レンダリング、メモリリーク
4. **セキュリティ**: セキュリティリスク、データ漏洩、XSS、CSRF対策
5. **テスト**: テストの必要性、テストカバレッジ
6. **設計**: アーキテクチャ、設計パターン、責任分離
7. **ドキュメント**: コメント、README、型定義の必要性

## トラブルシューティング

### 認証エラー

```
Error: Authentication required. Please run 'cursor-agent login' first
```

解決方法：
```bash
cursor agent login
```

### APIキーの設定

環境変数で設定する場合：
```bash
export CURSOR_API_KEY='your-api-key'
```

`~/.zshrc` または `~/.bashrc` に追加して永続化することもできます。

## 比較: Cursorエージェント vs OpenAI API

| 特徴 | Cursorエージェント | OpenAI API (review-pr.js) |
|------|-------------------|---------------------------|
| 認証 | Cursorアカウント | OpenAI APIキー |
| コスト | Cursorの利用料金 | OpenAI API利用料金 |
| インタラクティブ | ✅ 対話可能 | ❌ 一方向 |
| コードベース理解 | ✅ プロジェクト全体を理解 | ⚠️ PRの差分のみ |
| 実行速度 | やや遅い | 速い |
| 出力形式 | 対話形式 | Markdownファイル |

## 注意事項

- CursorエージェントはCursorアカウントの認証が必要です
- プライベートリポジトリのPRをレビューする場合、適切な権限が必要です
- APIキーは環境変数に設定して、Gitにコミットしないでください

