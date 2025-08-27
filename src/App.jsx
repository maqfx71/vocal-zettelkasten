function GithubPush({ transcript }) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [path, setPath] = useState('note.txt');
  const [message, setMessage] = useState('add note');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePush = async () => {
    if (!token || !repo || !path || !transcript) {
      setStatus('必要な情報が不足しています');
      return;
    }
    setLoading(true);
    setStatus('');
    try {
      // 既存ファイルのSHA取得（なければ新規）
      const apiBase = `https://api.github.com/repos/${repo}/contents/${path}`;
      let sha = undefined;
      const getRes = await fetch(apiBase, {
        headers: { Authorization: `token ${token}` }
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        sha = getData.sha;
      }
      // ファイル作成/更新
      const res = await fetch(apiBase, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: btoa(unescape(encodeURIComponent(transcript))),
          ...(sha ? { sha } : {})
        })
      });
      if (!res.ok) throw new Error('push失敗: ' + res.status);
      setStatus('push成功！');
    } catch (e) {
      setStatus('エラー: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '2.5rem', background: '#f3f4f6', borderRadius: '8px', padding: '1.2em', width: '340px' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.7em' }}>GitHubにpush</h3>
      <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="GitHubアクセストークン" style={{ width: '100%', marginBottom: '0.5em', padding: '0.5em', borderRadius: '6px', border: '1px solid #ccc' }} />
      <input type="text" value={repo} onChange={e => setRepo(e.target.value)} placeholder="ユーザー名/リポジトリ名" style={{ width: '100%', marginBottom: '0.5em', padding: '0.5em', borderRadius: '6px', border: '1px solid #ccc' }} />
      <input type="text" value={path} onChange={e => setPath(e.target.value)} placeholder="ファイルパス (例: note.txt)" style={{ width: '100%', marginBottom: '0.5em', padding: '0.5em', borderRadius: '6px', border: '1px solid #ccc' }} />
      <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="コミットメッセージ" style={{ width: '100%', marginBottom: '0.5em', padding: '0.5em', borderRadius: '6px', border: '1px solid #ccc' }} />
      <button onClick={handlePush} disabled={loading || !transcript} style={{ width: '100%', background: '#24292f', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', padding: '0.7em', cursor: transcript ? 'pointer' : 'not-allowed', marginBottom: '0.5em' }}>
        {loading ? '送信中...' : 'GitHubにpush'}
      </button>
      <div style={{ color: status.startsWith('エラー') ? '#f87171' : '#059669', minHeight: '1.5em' }}>{status}</div>
      <div style={{ fontSize: '0.9em', color: '#888', marginTop: '0.5em' }}>
        ※パブリック/プライベート両方可。repoスコープのPATが必要です。
      </div>
    </div>
  );
}
import { useRef, useState } from 'react'
import './App.css'

// Gemini APIコンポーネントは一時的に非表示
// function PromptInput({ prompt, setPrompt, onSend, loading }) {
//   ...省略...
// }

function TranscriptionInput({ transcript, setTranscript, isRecording, startRecording, stopRecording, handleCopy, copied }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          background: isRecording ? '#f87171' : '#60a5fa',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          border: 'none',
          borderRadius: '9999px',
          padding: '0.8em 2em',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          transition: 'background 0.2s',
        }}
      >
        {isRecording ? '録音停止' : '音声入力'}
      </button>
      <div style={{ position: 'relative', width: '320px', marginBottom: '0.7rem' }}>
        <textarea
          value={transcript}
          readOnly
          rows={6}
          style={{ width: '100%', fontSize: '1.1rem', padding: '1em', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical', background: '#fff', color: '#222' }}
          placeholder="ここに文字起こし結果が表示されます"
        />
        <button
          onClick={handleCopy}
          disabled={!transcript}
          style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: transcript ? 'pointer' : 'not-allowed',
            opacity: transcript ? 1 : 0.5,
          }}
          title="コピー"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={copied ? '#4ade80' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
        </button>
        {copied && <span style={{ position: 'absolute', top: '8px', right: '40px', color: '#4ade80', fontSize: '0.95em' }}>コピー！</span>}
      </div>
    </div>
  )
}

function App() {
  // 音声認識・文字起こし
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [copied, setCopied] = useState(false)
  const recognitionRef = useRef(null)
  // Gemini API
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [geminiResult, setGeminiResult] = useState('')

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      alert('クリップボードへのコピーに失敗しました');
    }
  }

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('このブラウザは音声認識に対応していません')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        text += event.results[i][0].transcript
      }
      setTranscript(text)
    }
    recognition.onend = () => {
      setIsRecording(false)
    }
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  // Gemini API送信
  const handleSendGemini = async () => {
    if (!prompt || !transcript) return;
    setLoading(true)
    setGeminiResult('')
    try {
      // Viteの環境変数からAPIキーを取得
      // プロキシサーバー経由でリクエスト
      const reqBody = {
        contents: [
          { role: 'user', parts: [ { text: prompt + '\n' + transcript } ] }
        ]
      };
      const reqOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      };
      console.log('[Gemini API fetch]', '/api/gemini', reqOptions);
      const res = await fetch('/api/gemini', reqOptions);
      if (!res.ok) throw new Error('APIリクエスト失敗')
      const data = await res.json()
      setGeminiResult(data.candidates?.[0]?.content?.parts?.[0]?.text || 'No result')
    } catch (e) {
      setGeminiResult('エラー: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#222' }}>vocal-zettelkasten</h1>
      <p style={{ color: '#555', marginTop: '1rem' }}>音声でノートを作成・管理するZettelkastenアプリ</p>
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <TranscriptionInput
          transcript={transcript}
          setTranscript={setTranscript}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          handleCopy={handleCopy}
          copied={copied}
        />
  {/* Gemini API関連UIは一時的に非表示 */}
        <GithubPush transcript={transcript} />
      </div>
    </div>
  )
}

export default App
