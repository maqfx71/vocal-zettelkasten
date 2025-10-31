import { test, expect } from '@playwright/test';

test.describe('vocal-zettelkasten 正常系テスト', () => {
  test('アプリが正常に起動し、音声入力ボタンが表示される', async ({ page }) => {
    // アプリにアクセス
    await page.goto('/');

    // タイトルが表示されていることを確認
    await expect(page.getByRole('heading', { name: /vocal-zettelkasten/i })).toBeVisible();

    // 説明文が表示されていることを確認
    await expect(page.getByText(/音声でノートを作成・管理するZettelkastenアプリ/i)).toBeVisible();

    // 音声入力ボタンが表示されていることを確認
    const recordButton = page.getByRole('button', { name: /音声入力/i });
    await expect(recordButton).toBeVisible();

    // テキストエリアが表示されていることを確認
    const textarea = page.getByPlaceholder(/ここに文字起こし結果が表示されます/i);
    await expect(textarea).toBeVisible();

    // GitHubに保存ボタンが表示されていることを確認
    const githubButton = page.getByRole('button', { name: /GitHubに保存/i });
    await expect(githubButton).toBeVisible();
  });
});
