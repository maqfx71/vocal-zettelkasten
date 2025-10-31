#!/bin/bash
# vocal-zettelkasten セットアップ&起動スクリプト
set -e

echo "=== vocal-zettelkasten セットアップ ==="

# 1. 依存インストール
echo "依存関係をインストール中..."
npm install

# 2. 環境変数ファイルの確認
if [ ! -f .env ]; then
  echo ""
  echo "⚠️  .envファイルが見つかりません"
  echo "以下の内容で.envファイルを作成してください:"
  echo ""
  echo "GITHUB_CLIENT_ID=あなたのClient ID"
  echo "GITHUB_CLIENT_SECRET=あなたのClient Secret"
  echo "REDIRECT_URI=http://localhost:5173"
  echo "PORT=3001"
  echo ""
  read -p ".envファイルを作成しましたか？ (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "セットアップを中断しました"
    exit 1
  fi
fi

# 3. バックエンドサーバー起動（バックグラウンド）
echo "バックエンドサーバーを起動中..."
nohup npm run server > server.log 2>&1 &
BACKEND_PID=$!
echo "バックエンドサーバーを起動しました（PID: $BACKEND_PID）"
echo "ログ: server.log"

# 4. 少し待機してサーバーが起動するのを待つ
sleep 2

# 5. React開発サーバー起動
echo "フロントエンド開発サーバーを起動中..."
echo "バックエンドサーバーを停止するには: kill $BACKEND_PID"
npm run dev
