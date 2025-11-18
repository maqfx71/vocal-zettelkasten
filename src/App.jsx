import { useRef, useState, useEffect } from 'react'

function GithubPush({ transcript }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // バックエンドAPIのURL（環境変数から取得、なければデフォルト）
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // ローカルストレージから読み込み
  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    const savedUser = localStorage.getItem('github_user');
    
    // OAuthコールバック処理（URLパラメータのcodeをチェック）
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // 認証コードがある場合は、まずローカルストレージを読み込まずにコールバック処理を実行
      handleOAuthCallback(code);
    } else {
      // 認証コードがない場合は、ローカルストレージから読み込み
      if (savedToken) setToken(savedToken);
      if (savedUser) setUser(JSON.parse(savedUser));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // OAuthコールバック処理
  const handleOAuthCallback = async (code) => {
    setIsAuthenticating(true);
    setStatus('認証処理中...');
    try {
      console.log('OAuthコールバック開始:', code);
      console.log('API_URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/auth/github/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      console.log('レスポンスステータス:', response.status);
      console.log('レスポンスOK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('APIエラーレスポンス:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: `HTTP ${response.status}: ${errorText}` };
        }
        throw new Error(error.error || `認証に失敗しました（${response.status}）`);
      }

      const data = await response.json();
      console.log('認証成功:', data);
      
      // トークンとユーザー情報を保存
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('github_token', data.access_token);
      localStorage.setItem('github_user', JSON.stringify(data.user));
      
      // URLから認証コードを削除して元のページに戻る
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setStatus('GitHubにログインしました！');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('OAuthコールバックエラー詳細:', error);
      setStatus('エラー: ' + error.message);
      // エラー時もURLから認証コードを削除
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // GitHub OAuth認証開始
  const handleLogin = async () => {
    setIsAuthenticating(true);
    setStatus('ログイン中...');
    try {
      const response = await fetch(`${API_URL}/api/auth/github`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('APIレスポンスエラー:', response.status, errorText);
        throw new Error(`ログイン情報の取得に失敗しました（${response.status}）。バックエンドサーバー（${API_URL}）が起動しているか確認してください。`);
      }
      const data = await response.json();
      if (!data.authUrl) {
        throw new Error('認証URLの取得に失敗しました。GitHub OAuth Appの設定を確認してください。');
      }
      // GitHubの認証ページにリダイレクト
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('ログインエラー:', error);
      setStatus('エラー: ' + error.message);
      setIsAuthenticating(false);
    }
  };

  // ログアウト
  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_user');
    setStatus('ログアウトしました');
    setTimeout(() => setStatus(''), 2000);
  };

  // トークンが変更されたらローカルストレージに保存
  useEffect(() => {
    if (token) {
      localStorage.setItem('github_token', token);
    }
  }, [token]);


  const handlePush = async () => {
    // 未ログインの場合はログインに誘導（transcriptチェックより先に）
    if (!token) {
      await handleLogin();
      return;
    }

    if (!transcript) {
      setStatus('文字起こし結果が必要です');
      return;
    }

    // デフォルト値の設定
    const savedRepo = localStorage.getItem('github_repo');
    const savedDir = localStorage.getItem('github_dir'); // ディレクトリ部分のみ保存
    const savedMessage = localStorage.getItem('github_message');
    const savedBranch = localStorage.getItem('github_branch');
    
    // タイムスタンプ生成（yyMMddhhmm形式）
    const generateTimestamp = () => {
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const MM = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      return yy + MM + dd + hh + mm;
    };
    
    const repo = savedRepo || (user ? `${user.login}/zettelkasten` : '');
    const branch = savedBranch || 'voice';
    const dir = savedDir || '01_FleetingNote';
    const timestamp = generateTimestamp();
    const path = `${dir}/${timestamp}.md`; // ファイル名は毎回タイムスタンプで生成（.md形式）
    const message = savedMessage || 'add note from vocal-zettelkasten';

    if (!repo) {
      setStatus('リポジトリ名を設定してください（ローカルストレージまたは自動設定）');
      return;
    }

    setLoading(true);
    setStatus('');
    try {
      // リポジトリが存在するか確認
      const repoInfo = repo.split('/');
      const repoOwner = repoInfo[0];
      const repoName = repoInfo[1];
      const repoCheckUrl = `https://api.github.com/repos/${repo}`;
      const repoCheckRes = await fetch(repoCheckUrl, {
        headers: { Authorization: `token ${token}` }
      });

      let repoData;
      if (!repoCheckRes.ok) {
        if (repoCheckRes.status === 404) {
          // リポジトリが存在しない場合は作成を試みる
          setStatus('リポジトリが存在しません。作成中...');
          const createRepoRes = await fetch(`https://api.github.com/user/repos`, {
            method: 'POST',
            headers: {
              Authorization: `token ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: repoName,
              description: 'vocal-zettelkasten notes',
              private: false,
              auto_init: true
            })
          });

          if (!createRepoRes.ok) {
            const errorData = await createRepoRes.json().catch(() => ({}));
            throw new Error(`リポジトリの作成に失敗しました（${createRepoRes.status}）: ${errorData.message || 'リポジトリを作成する権限がないか、同名のリポジトリが既に存在します'}`);
          }
          setStatus('リポジトリを作成しました。ファイルを保存中...');
          // リポジトリ作成後、少し待機（GitHub APIの反映待ち）
          await new Promise(resolve => setTimeout(resolve, 1000));
          // 作成後のリポジトリ情報を取得
          const newRepoCheckRes = await fetch(repoCheckUrl, {
            headers: { Authorization: `token ${token}` }
          });
          if (!newRepoCheckRes.ok) {
            throw new Error('作成したリポジトリの情報取得に失敗しました');
          }
          repoData = await newRepoCheckRes.json();
        } else {
          const errorData = await repoCheckRes.json().catch(() => ({}));
          throw new Error(`リポジトリへのアクセスに失敗しました（${repoCheckRes.status}）: ${errorData.message || 'アクセス権限がない可能性があります'}`);
        }
      } else {
        repoData = await repoCheckRes.json();
      }

      // デフォルトブランチを取得
      const defaultBranch = repoData.default_branch;

      // 指定ブランチが存在するか確認
      let branchExists = false;
      if (branch !== defaultBranch) {
        const branchCheckRes = await fetch(`https://api.github.com/repos/${repo}/branches/${branch}`, {
          headers: { Authorization: `token ${token}` }
        });
        branchExists = branchCheckRes.ok;

        if (!branchExists) {
          // ブランチが存在しない場合は作成
          setStatus('ブランチが存在しません。作成中...');
          
          // デフォルトブランチのSHAを取得
          const defaultBranchRes2 = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${defaultBranch}`, {
            headers: { Authorization: `token ${token}` }
          });
          if (!defaultBranchRes2.ok) {
            throw new Error('デフォルトブランチの情報取得に失敗しました');
          }
          const defaultBranchData = await defaultBranchRes2.json();
          const defaultSha = defaultBranchData.object.sha;

          // 新しいブランチを作成
          const createBranchRes = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
            method: 'POST',
            headers: {
              Authorization: `token ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ref: `refs/heads/${branch}`,
              sha: defaultSha
            })
          });

          if (!createBranchRes.ok) {
            const errorData = await createBranchRes.json().catch(() => ({}));
            throw new Error(`ブランチの作成に失敗しました（${createBranchRes.status}）: ${errorData.message || ''}`);
          }
          setStatus('ブランチを作成しました。ファイルを保存中...');
        }
      } else {
        branchExists = true;
      }

      // 既存ファイルのSHA取得（なければ新規）
      const apiBase = `https://api.github.com/repos/${repo}/contents/${path}`;
      let sha = undefined;
      const getRes = await fetch(`${apiBase}?ref=${branch}`, {
        headers: { Authorization: `token ${token}` }
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        sha = getData.sha;
      } else if (getRes.status !== 404) {
        // 404以外のエラーは問題
        const errorData = await getRes.json().catch(() => ({}));
        throw new Error(`ファイル情報の取得に失敗しました（${getRes.status}）: ${errorData.message || ''}`);
      }
      
      // ファイル作成/更新（ブランチ指定）
      const res = await fetch(apiBase, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: btoa(unescape(encodeURIComponent(transcript))),
          branch: branch,
          ...(sha ? { sha } : {})
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`保存に失敗しました（${res.status}）: ${errorData.message || ''}`);
      }
      
      setStatus('保存成功！');
      
      // 成功したらローカルストレージに保存（ディレクトリ部分のみ）
      localStorage.setItem('github_repo', repo);
      localStorage.setItem('github_branch', branch);
      localStorage.setItem('github_dir', dir);
      localStorage.setItem('github_message', message);
    } catch (e) {
      console.error('GitHub保存エラー:', e);
      setStatus('エラー: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 rounded-lg p-5 w-full max-w-sm border-2 border-gray-200 shadow-sm">
      <button 
        onClick={handlePush} 
        disabled={loading || (token && !transcript) || isAuthenticating} 
        className={`w-full font-bold border-none rounded-md py-2.5 mb-2 transition-all ${
          (token && !transcript) || isAuthenticating
            ? 'bg-gray-400 cursor-not-allowed opacity-60'
            : 'bg-gray-800 text-white cursor-pointer hover:bg-gray-900'
        }`}
      >
        {loading ? '保存中...' : isAuthenticating ? 'ログイン中...' : token ? 'GitHubに保存' : 'GitHubに保存（未ログイン）'}
      </button>
      <div className={`min-h-[1.5em] text-sm ${
        status.startsWith('エラー') ? 'text-red-500' : 'text-green-600'
      }`}>
        {status}
      </div>
      {token && user && (
        <div className="text-xs text-gray-600 mt-2 flex items-center gap-2">
          {user.avatar_url && (
            <img src={user.avatar_url} alt={user.login} className="w-4 h-4 rounded-full" />
          )}
          <span>{user.name || user.login} としてログイン中</span>
          <button
            onClick={handleLogout}
            className="bg-transparent border-none text-red-500 cursor-pointer text-xs underline ml-auto"
          >
            ログアウト
          </button>
        </div>
      )}
      <div className="text-sm text-gray-500 mt-2">
        ※ログイン情報はローカルストレージに保存されます。リポジトリは自動設定されます。
      </div>
    </div>
  );
}

function TranscriptionInput({ transcript, setTranscript, isRecording, startRecording, stopRecording, handleCopy, copied }) {
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`font-bold text-lg border-none rounded-full px-8 py-3 cursor-pointer mb-6 transition-all ${
          isRecording 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-blue-400 text-white hover:bg-blue-500'
        }`}
      >
        {isRecording ? '録音停止' : '音声入力'}
      </button>
      <div className="relative w-full max-w-sm mb-3">
        <textarea
          value={transcript}
          readOnly
          rows={6}
          className="w-full text-lg p-4 rounded-lg border border-gray-300 resize-y bg-white text-gray-800 box-border"
          placeholder="ここに文字起こし結果が表示されます"
        />
        <button
          onClick={handleCopy}
          disabled={!transcript}
          className={`absolute top-2 right-3 bg-transparent border-none p-0 cursor-${
            transcript ? 'pointer' : 'not-allowed'
          } ${transcript ? 'opacity-100' : 'opacity-50'}`}
          title="コピー"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={copied ? '#4ade80' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
        </button>
        {copied && <span className="absolute top-2 right-11 text-green-500 text-sm">コピー！</span>}
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
  const finalTranscriptRef = useRef('')  // 確定済みテキストを保持

  // レイアウト設定
  const [layoutMode, setLayoutMode] = useState('vertical')

  // ローカルストレージからレイアウト設定を読み込み
  useEffect(() => {
    const savedLayout = localStorage.getItem('layout_mode');
    if (savedLayout) {
      setLayoutMode(savedLayout);
    }
  }, []);

  // レイアウト設定をローカルストレージに保存
  const handleLayoutChange = (mode) => {
    setLayoutMode(mode);
    localStorage.setItem('layout_mode', mode);
  };

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

  const startRecording = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('このブラウザは音声認識に対応していません。ChromeまたはEdgeを使用してください。')
      return
    }
    
    // マイクへのアクセス許可を確認
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 許可されたらストリームを停止（SpeechRecognitionが管理するため）
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('マイクアクセスエラー:', error);
      alert('マイクへのアクセスが拒否されました。\n\n解決方法:\n1. ブラウザのアドレスバーでマイクの許可を確認\n2. ブラウザの設定でマイクの許可を有効化\n3. システム設定（macOS: システム設定 > プライバシーとセキュリティ > マイク）でブラウザのマイク権限を確認');
      return;
    }
    
    // 録音開始時に確定済みテキストをリセット
    finalTranscriptRef.current = transcript || ''
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.interimResults = true
    recognition.continuous = true  // 継続的に録音
    
    recognition.onresult = (event) => {
      let interimText = ''
      
      // 確定結果と暫定結果を処理
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i]
        const transcript = result[0].transcript
        
        if (result.isFinal) {
          // 確定結果は累積的に追加
          finalTranscriptRef.current += transcript + ' '
        } else {
          // 暫定結果は最新のものだけを保持
          interimText = transcript
        }
      }
      
      // 確定済みテキスト + 暫定テキストを表示
      setTranscript(finalTranscriptRef.current + interimText)
    }
    
    recognition.onerror = (event) => {
      console.error('音声認識エラー:', event.error)
      
      // エラーの種類に応じて処理
      switch (event.error) {
        case 'no-speech':
          // 無音が続いても停止しない（エラーを無視）
          return
        case 'audio-capture':
          alert('マイクへのアクセスが拒否されました。ブラウザの設定でマイクの許可を確認してください。')
          setIsRecording(false)
          break
        case 'not-allowed':
          alert('マイクの使用が許可されていません。ブラウザの設定でマイクの許可を有効にしてください。')
          setIsRecording(false)
          break
        case 'aborted':
          // 手動で停止された場合は何もしない
          return
        case 'network':
          alert('ネットワークエラーが発生しました。')
          setIsRecording(false)
          break
        default:
          // その他のエラー
          console.error('音声認識エラー詳細:', event.error)
          setIsRecording(false)
          if (event.error !== 'aborted') {
            alert(`音声認識エラー: ${event.error}\n\n解決方法:\n1. ブラウザでマイクの許可を確認\n2. システム設定でマイクの権限を確認\n3. 別のブラウザで試す`)
          }
      }
    }
    
    recognition.onend = () => {
      // 手動で停止された場合は再起動しない
      if (isRecording && recognitionRef.current) {
        // 自動終了の場合は再起動を試みる
        try {
          recognition.start()
        } catch (e) {
          console.error('音声認識再起動エラー:', e)
          setIsRecording(false)
        }
      } else {
        setIsRecording(false)
      }
    }
    
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current.abort()  // 完全に停止
      recognitionRef.current = null
      setIsRecording(false)
      // 確定済みテキストを更新
      finalTranscriptRef.current = transcript
    }
  }

  // レイアウトモードに応じたクラス名を取得
  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'horizontal':
        return {
          container: 'flex flex-row gap-8 items-start justify-center flex-wrap',
          transcription: 'flex-1 min-w-[300px] max-w-[500px]',
          github: 'flex-1 min-w-[300px] max-w-[400px] mt-0'
        };
      case 'grid':
        return {
          container: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full max-w-7xl px-8',
          transcription: 'mt-0',
          github: 'mt-0'
        };
      case 'sidebar':
        return {
          container: 'flex flex-row gap-8 items-start w-full max-w-7xl px-8',
          transcription: 'flex-[2] max-w-[600px]',
          github: 'flex-1 max-w-[400px] mt-0 sticky top-5'
        };
      default: // vertical
        return {
          container: 'flex flex-col items-center',
          transcription: 'mt-0',
          github: 'mt-10'
        };
    }
  };

  const layoutClasses = getLayoutClasses();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 py-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">vocal-zettelkasten</h1>
      <p className="text-gray-600">音声でノートを作成・管理するZettelkastenアプリ</p>
      <div className={`mt-8 ${layoutClasses.container}`}>
        <div className={`${layoutClasses.transcription} bg-white rounded-xl p-6 border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow`}>
          <TranscriptionInput
            transcript={transcript}
            setTranscript={setTranscript}
            isRecording={isRecording}
            startRecording={startRecording}
            stopRecording={stopRecording}
            handleCopy={handleCopy}
            copied={copied}
          />
        </div>
        <div className={`${layoutClasses.github} bg-white rounded-xl p-6 border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow`}>
          <GithubPush transcript={transcript} />
        </div>
      </div>
    </div>
  )
}

export default App
