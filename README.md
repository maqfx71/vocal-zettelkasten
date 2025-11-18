
# vocal-zettelkasten

音声入力でノートを作成し、クリップボードコピーやGitHubへの保存ができるZettelkasten方式の1ページWebアプリです。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. GitHub OAuth Appの作成

GitHub OAuth認証を使用するため、GitHub OAuth Appを作成する必要があります。

1. GitHubにログインして、[Settings](https://github.com/settings) → [Developer settings](https://github.com/settings/developers) → [OAuth Apps](https://github.com/settings/developers) に移動
2. 「New OAuth App」をクリック
3. 以下の情報を入力：
   - **Application name**: `vocal-zettelkasten`（任意の名前）
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173`
4. 「Register application」をクリック
5. **Client ID** と **Client Secret** をコピー

### 3. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成：

```env
GITHUB_CLIENT_ID=あなたのClient ID
GITHUB_CLIENT_SECRET=あなたのClient Secret
REDIRECT_URI=http://localhost:5173
PORT=3001
```

### 4. 開発サーバーの起動

**ターミナル1** - バックエンドサーバー:
```bash
npm run server
```

**ターミナル2** - フロントエンドサーバー:
```bash
npm run dev
```

または、`bash setup_and_start.sh` を実行（バックエンドも自動起動）

## 使用方法

### 1. デプロイ済みアプリを利用する場合（推奨）

1. ブラウザで `https://vocal-zettelkasten.vercel.app/` を開く
2. 「音声入力」ボタンで音声を入力
3. 「GitHubでログイン」ボタンでGitHubにログイン（初回のみ）
4. リポジトリ名、ファイルパス、コミットメッセージを入力
5. 「GitHubに保存」ボタンで保存

### 2. ローカル環境で利用する場合

1. 「セットアップ」に従って環境構築・サーバー起動を行う
2. ブラウザで `http://localhost:5173` を開く
3. 「音声入力」ボタンで音声を入力
4. 「GitHubでログイン」ボタンでGitHubにログイン（初回のみ）
5. リポジトリ名、ファイルパス、コミットメッセージを入力
6. 「GitHubに保存」ボタンで保存

## 主な機能
- 音声入力によるリアルタイム文字起こし
- 文字起こし結果のクリップボードコピー（テキストエリア右上アイコン）
- GitHub OAuth認証によるログイン
- 文字起こし内容をGitHubリポジトリに直接保存
- ログイン情報はローカルストレージに自動保存

## 技術
- **フロントエンド**: React, Vite, Web Speech API
- **バックエンド**: Node.js, Express
- **認証**: GitHub OAuth 2.0
- **API**: GitHub REST API

## 注意事項
- 音声認識はChrome推奨
- バックエンドサーバーは別途起動が必要
- GitHub OAuth Appの設定が必要
- ログイン情報はローカルストレージに保存されます

## 開発フロー

このプロジェクトは以下の開発フローで進めます：

1. **developブランチで作業**
   - 機能追加やバグ修正は`develop`ブランチで行います
   - コミット後、`main`ブランチに向けてPRを作成します

2. **CI（継続的統合）**
   - PR作成時、または`main`/`develop`ブランチへのpush時に自動実行
   - PlaywrightによるE2Eテストを実行
   - テスト結果はGitHub Actionsで確認できます

3. **CD（継続的デプロイ）**
   - `main`ブランチへのマージ時に自動実行
   - Vercelに自動デプロイされます

### ローカルでのテスト実行

```bash
# Playwrightテストを実行
npm test

# Playwright UIモードでテストを実行
npm run test:ui
```

### GitHub Actionsの設定

#### CI設定
- `.github/workflows/ci.yml` - Playwrightテストを実行

#### CD設定
- `.github/workflows/cd.yml` - Vercelへのデプロイ

**必要なGitHub Secrets:**
- `VERCEL_TOKEN` - Vercelのアクセストークン
- `VERCEL_ORG_ID` - Vercelの組織ID
- `VERCEL_PROJECT_ID` - VercelのプロジェクトID

これらの値は[Vercel Dashboard](https://vercel.com/dashboard)のプロジェクト設定から取得できます。

## 今後の拡張案
- ノートの保存・管理機能
- タグやリンク付与、検索
