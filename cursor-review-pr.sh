#!/bin/bash

# Cursor CLI エージェントを使用してPRをレビューするスクリプト

set -e

OWNER=$1
REPO=$2
PR_NUMBER=$3

if [ -z "$OWNER" ] || [ -z "$REPO" ] || [ -z "$PR_NUMBER" ]; then
    echo "使い方: $0 <owner> <repo> <pr-number>"
    echo "例: $0 qureshiagile vocal-zettelkasten 1"
    exit 1
fi

echo "📝 Pull Request #${PR_NUMBER} をCursorエージェントでレビューしています..."
echo "リポジトリ: ${OWNER}/${REPO}"
echo ""

# PR情報を取得
PR_INFO=$(curl -s "https://api.github.com/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}")

if echo "$PR_INFO" | grep -q '"message":"Not Found"'; then
    echo "❌ エラー: PRが見つかりませんでした。リポジトリやPR番号を確認してください。"
    exit 1
fi

PR_TITLE=$(echo "$PR_INFO" | grep -o '"title":"[^"]*' | cut -d'"' -f4 || echo "タイトルなし")
PR_BODY=$(echo "$PR_INFO" | grep -o '"body":"[^"]*' | cut -d'"' -f4 || echo "説明なし")
PR_AUTHOR=$(echo "$PR_INFO" | grep -o '"login":"[^"]*' | head -1 | cut -d'"' -f4 || echo "不明")

# 変更ファイルを取得
FILES=$(curl -s "https://api.github.com/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}/files")
FILE_COUNT=$(echo "$FILES" | grep -o '"filename"' | wc -l | tr -d ' ' || echo "0")

echo "タイトル: ${PR_TITLE}"
echo "作成者: ${PR_AUTHOR}"
echo "変更ファイル数: ${FILE_COUNT}"
echo ""

# 変更内容を簡潔にまとめる
CHANGED_FILES=$(echo "$FILES" | grep -o '"filename":"[^"]*' | cut -d'"' -f4 | head -10 | tr '\n' ',' | sed 's/,$//')

# レビュー用のプロンプトを作成
REVIEW_PROMPT="以下のGitHub Pull Requestをコードレビューしてください。

**Pull Request情報:**
- URL: https://github.com/${OWNER}/${REPO}/pull/${PR_NUMBER}
- タイトル: ${PR_TITLE}
- 説明: ${PR_BODY}
- 作成者: ${PR_AUTHOR}
- 変更ファイル数: ${FILE_COUNT}
- 変更ファイル（主要）: ${CHANGED_FILES}

**レビューの観点:**
1. **コード品質**: 可読性、保守性、ベストプラクティスの遵守
2. **バグ・エラー**: 潜在的なバグ、エラーハンドリング、エッジケース
3. **パフォーマンス**: パフォーマンスの問題、不要な再レンダリング、メモリリーク
4. **セキュリティ**: セキュリティリスク、データ漏洩、XSS、CSRF対策
5. **テスト**: テストの必要性、テストカバレッジ
6. **設計**: アーキテクチャ、設計パターン、責任分離
7. **ドキュメント**: コメント、README、型定義の必要性

**技術スタック:**
- React 19
- Vite
- Node.js/Express
- Web Speech API
- GitHub OAuth

Pull Requestの差分を確認して、具体的で建設的なフィードバックを日本語で提供してください。PR URLを確認して、実際の変更内容をレビューしてください。"

# 認証状態を確認
echo "🔐 Cursor認証状態を確認中..."
CURSOR_AUTH_STATUS=$(cursor agent status 2>&1 || echo "not authenticated")

if echo "$CURSOR_AUTH_STATUS" | grep -q "not authenticated\|Authentication required"; then
    echo ""
    echo "⚠️  Cursor CLIの認証が必要です。"
    echo ""
    echo "認証方法（いずれか）:"
    echo "1. ログインコマンドを実行: cursor agent login"
    echo "2. APIキーを環境変数に設定: export CURSOR_API_KEY='your-api-key'"
    echo ""
    read -p "今すぐログインしますか？ (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cursor agent login
    else
        echo "認証後に再度実行してください。"
        exit 1
    fi
fi

echo "🤖 Cursorエージェントを起動しています..."
echo ""

# 出力ファイルを設定
OUTPUT_FILE="review-pr-${PR_NUMBER}-cursor.md"

# Cursor CLIエージェントでレビューを実行
if command -v cursor &> /dev/null; then
    echo "プロンプトをCursorエージェントに送信しています..."
    echo ""
    
    # まず対話モードで実行（ユーザーが確認できるように）
    echo "=== Cursorエージェント起動 ==="
    echo ""
    echo "レビュープロンプトを送信します。"
    echo ""
    
    # --printオプションで非対話的に実行を試みる
    if [ -n "$CURSOR_API_KEY" ]; then
        echo "APIキーが設定されているため、非対話モードで実行します..."
        cursor agent --print --output-format text "$REVIEW_PROMPT" > "$OUTPUT_FILE" 2>&1
        
        if [ $? -eq 0 ] && [ -f "$OUTPUT_FILE" ] && [ -s "$OUTPUT_FILE" ]; then
            echo ""
            echo "✅ レビュー完了！結果は ${OUTPUT_FILE} に保存されました。"
            echo ""
            echo "=== レビュー結果 ==="
            cat "$OUTPUT_FILE"
        else
            echo "⚠️  非対話モードでエラーが発生しました。対話モードで再試行します..."
            echo ""
            cursor agent "$REVIEW_PROMPT"
        fi
    else
        echo "対話モードでCursorエージェントを起動します..."
        echo ""
        cursor agent "$REVIEW_PROMPT"
    fi
else
    echo "❌ エラー: Cursor CLIがインストールされていません"
    echo "インストール方法: curl https://cursor.sh/install | sh"
    exit 1
fi
