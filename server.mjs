// Gemini API プロキシサーバー (Node.js Express, ESM対応)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/gemini', async (req, res) => {
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'APIキー未設定' });
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  try {
    const apiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = 5174;
app.listen(port, () => console.log('Gemini proxy server running on port', port));
