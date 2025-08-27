#!/bin/bash
# vocal-zettelkasten セットアップ&起動スクリプト
set -e

# 1. 依存インストール
npm install

# 2. .envファイル作成例
if [ ! -f .env ]; then
  echo "VITE_GEMINI_API_KEY=your_gemini_api_key_here" > .env
  echo ".envファイルを作成しました。APIキーを記入してください。"
fi

# 3. Geminiプロキシサーバー依存インストール
npm install express cors node-fetch dotenv

# 4. プロキシサーバー起動（バックグラウンド）
nohup node server.mjs > gemini-proxy.log 2>&1 &
echo "Geminiプロキシサーバーをバックグラウンドで起動しました。"

# 5. React開発サーバー起動
npm run dev
