import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { test, expect, Page } from '@playwright/test';
import { testUser } from '../helpers';

let speachesAvailable = false;

/**
 * Check if the Speaches API is running and accessible
 */
async function checkSpeachesAPI(): Promise<boolean> {
  const baseUrl = process.env.SPEACHES_BASE_URL?.trim();
  if (!baseUrl) {
    console.warn('[Kilo E2E] SPEACHES_BASE_URL not configured - audio tests will be skipped');
    return false;
  }

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      console.log('[Kilo E2E] Speaches API is available');
      return true;
    }
    console.warn(`[Kilo E2E] Speaches API health check failed with status: ${response.status} - audio tests will be skipped`);
    return false;
  } catch (error) {
    console.warn(`[Kilo E2E] Speaches API is not reachable: ${error instanceof Error ? error.message : error} - audio tests will be skipped`);
    return false;
  }
}

const loginAsUser = async (page: Page) => {
  await page.goto('/login');
  await page.fill('input#identifier', testUser.email);
  await page.fill('input#password', testUser.password);
  await page.click('button[type="submit"]');
};

test.describe('Kilo Entry Form', () => {

  test.beforeAll(async () => {
    speachesAvailable = await checkSpeachesAPI();

    const passwordHash = await hashPassword(testUser.password);
    await db.insertInto('users').values({
      id: testUser.id,
      email: testUser.email,
      username: testUser.username,
      password_hash: passwordHash,
      system_role: 'user',
    }).execute();
  });

  test.afterAll(async () => {
    await db.deleteFrom('kilo').where('user_id', '=', testUser.id).execute();
    await db.deleteFrom('users').where('id', '=', testUser.id).execute();
  });

  test('Save Entry button is disabled until all questions are answered', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/kilo');

    const saveButton = page.locator('button', { hasText: 'Save Entry' });

    // Button should be disabled initially
    await expect(saveButton).toBeDisabled();

    // Fill only q1 — still disabled
    await page.locator('textarea').nth(0).fill('Sunny and warm');
    await expect(saveButton).toBeDisabled();

    // Fill q2 — still disabled
    await page.locator('textarea').nth(1).fill('I see trees and clouds');
    await expect(saveButton).toBeDisabled();

    // Fill q3 — now enabled
    await page.locator('textarea').nth(2).fill('Going for a walk');
    await expect(saveButton).toBeEnabled();
  });

  test('allows a user to submit a kilo entry with text and redirects to dashboard', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/kilo');

    await page.locator('textarea').nth(0).fill('Cloudy with a chance of rain');
    await page.locator('textarea').nth(1).fill('I see mountains in the distance');
    await page.locator('textarea').nth(2).fill('Excited to go hiking today');

    await page.click('button:has-text("Save Entry")');

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**');
    expect(page.url()).toContain('/dashboard');

    // Verify entry is saved in the database
    const entry = await db.selectFrom('kilo').selectAll().where('user_id', '=', testUser.id).executeTakeFirst();
    expect(entry).not.toBeNull();
    expect(entry?.q1).toBe('Cloudy with a chance of rain');
    expect(entry?.q2).toBe('I see mountains in the distance');
    expect(entry?.q3).toBe('Excited to go hiking today');
    expect(entry?.user_id).toBe(testUser.id);
  });

  test('allows a user to submit a kilo entry with audio transcription', async ({ page }) => {
    test.skip(!speachesAvailable, 'Speaches API is not available - skipping audio transcription test');

    await loginAsUser(page);
    await page.goto('/kilo');

    // Use the compact mic button for q1
    const micButtons = page.locator('button[title="Record audio"]');
    await micButtons.nth(0).click(); // Start recording
    await page.waitForTimeout(1000);
    await page.locator('button[title="Stop recording"]').nth(0).click(); // Stop recording

    // Wait for transcription to populate q1 textarea
    await page.waitForFunction(() => {
      const textareas = document.querySelectorAll('textarea');
      return textareas[0]?.value?.length > 0;
    }, { timeout: 15000 });

    // Fill remaining questions with text
    await page.locator('textarea').nth(1).fill('I see the ocean from my window');
    await page.locator('textarea').nth(2).fill('Planning to surf this afternoon');

    await page.click('button:has-text("Save Entry")');

    await page.waitForURL('**/dashboard**');
    expect(page.url()).toContain('/dashboard');

    const entry = await db.selectFrom('kilo').selectAll().where('user_id', '=', testUser.id).executeTakeFirst();
    expect(entry).not.toBeNull();
    expect(entry?.q1).toBeTruthy();
    expect(entry?.q2).toBe('I see the ocean from my window');
    expect(entry?.q3).toBe('Planning to surf this afternoon');
  });

});
