#!/usr/bin/env node

/**
 * Pull Request AI Review Script
 * 
 * 使い方:
 *   node review-pr.js <owner> <repo> <pr-number> [api-key]
 * 
 * 例:
 *   node review-pr.js qureshiagile vocal-zettelkasten 1
 */

import { execSync } from 'child_process';
import fs from 'fs';

const owner = process.argv[2];
const repo = process.argv[3];
const prNumber = process.argv[4];
const apiKey = process.argv[5] || process.env.OPENAI_API_KEY;

if (!owner || !repo || !prNumber) {
  console.error('使い方: node review-pr.js <owner> <repo> <pr-number> [api-key]');
  console.error('例: node review-pr.js qureshiagile vocal-zettelkasten 1');
  process.exit(1);
}

if (!apiKey) {
  console.error('エラー: OPENAI_API_KEYが設定されていません');
  console.error('環境変数OPENAI_API_KEYを設定するか、引数として渡してください');
  process.exit(1);
}

async function fetchPRInfo() {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  console.log(`PR情報を取得中: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

async function fetchPRFiles() {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;
  console.log(`変更ファイルを取得中: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

async function reviewWithAI(prInfo, files) {
  // 変更内容を整理
  let diffContent = '';
  let changedFiles = [];
  
  for (const file of files) {
    if (file.status === 'removed') continue;
    
    const additions = file.additions || 0;
    const deletions = file.deletions || 0;
    const changes = additions + deletions;
    
    if (changes === 0) continue;
    
    diffContent += `\n\n=== File: ${file.filename} ===\n`;
    diffContent += `変更: +${additions} -${deletions}\n`;
    diffContent += `\n${file.patch || '(バイナリファイルまたは内容が大きすぎます)'}`;
    
    changedFiles.push(file.filename);
  }
  
  if (!diffContent) {
    console.log('レビュー対象となる変更が見つかりませんでした');
    return;
  }
  
  // レビュープロンプトを準備
  const reviewPrompt = `あなたは経験豊富なコードレビュアーです。以下のPull Requestの変更をレビューしてください。

# Pull Request情報
- タイトル: ${prInfo.title}
- 説明: ${prInfo.body || '説明なし'}
- 作成者: ${prInfo.user.login}
- 変更ファイル数: ${files.length}
- 変更ファイル: ${changedFiles.join(', ')}

# 変更内容
${diffContent}

# レビューの観点
1. **コード品質**: 可読性、保守性、ベストプラクティスの遵守
2. **バグ・エラー**: 潜在的なバグ、エラーハンドリング、エッジケース
3. **パフォーマンス**: パフォーマンスの問題、不要な再レンダリング、メモリリーク
4. **セキュリティ**: セキュリティリスク、データ漏洩、XSS、CSRF対策
5. **テスト**: テストの必要性、テストカバレッジ
6. **設計**: アーキテクチャ、設計パターン、責任分離
7. **ドキュメント**: コメント、README、型定義の必要性

# 技術スタック
- React 19
- Vite
- Node.js/Express
- Web Speech API
- GitHub OAuth

レビュー結果は以下の形式で返してください:
- **良い点**: 
- **改善提案**: 
- **バグ・問題**: 
- **セキュリティ**: 
- **その他**: 

各観点について具体的で建設的なフィードバックを提供してください。`;

  console.log('\nAIレビューを実行中...\n');
  
  // OpenAI APIを呼び出し
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたは経験豊富なシニアエンジニアで、コードレビューを専門としています。建設的で実用的なフィードバックを日本語で提供してください。'
        },
        {
          role: 'user',
          content: reviewPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function main() {
  try {
    console.log(`\n📝 Pull Request #${prNumber} をレビューしています...\n`);
    console.log(`リポジトリ: ${owner}/${repo}\n`);
    
    const prInfo = await fetchPRInfo();
    console.log(`タイトル: ${prInfo.title}`);
    console.log(`作成者: ${prInfo.user.login}`);
    console.log(`状態: ${prInfo.state}`);
    console.log(`ベースブランチ: ${prInfo.base.ref} <- ${prInfo.head.ref}\n`);
    
    const files = await fetchPRFiles();
    console.log(`変更ファイル数: ${files.length}\n`);
    
    const review = await reviewWithAI(prInfo, files);
    
    console.log('\n' + '='.repeat(80));
    console.log('🤖 AI コードレビュー結果');
    console.log('='.repeat(80) + '\n');
    console.log(review);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 結果をファイルに保存
    const outputFile = `review-pr-${prNumber}.md`;
    fs.writeFileSync(outputFile, `# AI コードレビュー: PR #${prNumber}\n\n${prInfo.title}\n\n${review}`);
    console.log(`✅ レビュー結果を ${outputFile} に保存しました\n`);
    
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
}

main();

