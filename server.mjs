// GitHub OAuth認証サーバー
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// GitHub OAuth設定（環境変数から取得）
const CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5173';

// OAuth認証開始エンドポイント
app.get('/api/auth/github', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const scope = 'repo'; // リポジトリへのアクセス権限
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&state=${state}`;
  
  res.json({ authUrl, state });
});

// OAuth認証コールバック（トークン取得）
app.post('/api/auth/github/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: '認証コードがありません' });
  }

  try {
    // GitHub APIにアクセストークンリクエストを送信
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || tokenData.error });
    }

    // ユーザー情報を取得
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    res.json({
      access_token: tokenData.access_token,
      user: {
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
      },
    });
  } catch (error) {
    console.error('OAuthエラー:', error);
    res.status(500).json({ error: '認証に失敗しました', details: error.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`GitHub OAuthサーバー起動: http://localhost:${port}`);
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn('⚠️ 警告: GITHUB_CLIENT_ID または GITHUB_CLIENT_SECRET が設定されていません');
    console.warn('環境変数を設定するか、.envファイルを作成してください');
  }
});

