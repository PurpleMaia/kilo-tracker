import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { test, expect, Page } from '@playwright/test';
import { testUser } from '../helpers';

const loginAsUser = async (page: Page) => {
  await page.goto('/login');
  await page.fill('input#identifier', testUser.email);
  await page.fill('input#password', testUser.password);
  await page.click('button[type="submit"]');
}

test.describe('Kilo Entry Form', () => {
  test.beforeAll(async () => {
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
    // Clean up kilo entry
    await db.deleteFrom('kilo').where('user_id', '=', testUser.id).execute();

    // Clean up test user from the database
    await db.deleteFrom('users').where('id', '=', testUser.id).execute();
  });

  test('allows a user to submit a kilo entry with audio & skip questions', async ({ page }) => {
    // Log in as test user
    await loginAsUser(page);

    // Navigate to Kilo Entry Form
    await page.click('text=Try the KILO Entry Form');

    // "Answer" first question form
    const recordButton = page.locator('#audio-recorder-button');
    await recordButton.click(); // Start recording
    await page.waitForTimeout(1000);
    await recordButton.click(); // Stop recording

    // Wait for transcription to complete and text input to appear
    await page.waitForSelector('textarea');

    // Allow to edit transcribed text and proceed through questions
    await page.fill('textarea', 'This is my response to question 1');
    await page.click('text=Next');

    // Skip through remaining questions without answering
    await page.click('text=Next');

    // Submit the form
    await page.click('text=Save Entry');

    // Verify success message
    await expect(page.locator('text=Your entry has been saved successfully!')).toBeVisible();

    // Verify entry is saved in the database
    const entry = await db.selectFrom('kilo').selectAll().where('user_id', '=', testUser.id).executeTakeFirst();
    expect(entry).not.toBeNull();
    expect(entry?.q1).toContain('This is my response to question 1');
    expect(entry?.q2).toBeNull();
    expect(entry?.q3).toBeNull();
    expect(entry?.user_id).toBe(testUser.id);
  });

  test('allows a user to submit a kilo entry with text only', async ({ page }) => {
    // Log in as test user
    await loginAsUser(page);
    
    // Navigate to Kilo Entry Form
    await page.click('text=Try the KILO Entry Form');   

    // Skip audio recording and answer questions with text
    await page.click('text=Prefer to type instead?');    
    await page.waitForSelector('textarea');

    await page.fill('textarea', 'This is my response to question 1');
    await page.click('text=Next');
    await page.click('text=Prefer to type instead?');    
    await page.waitForSelector('textarea');
    await page.fill('textarea', 'This is my response to question 2');
    await page.click('text=Next');
    await page.click('text=Prefer to type instead?');    
    await page.waitForSelector('textarea');
    await page.fill('textarea', 'This is my response to question 3');

    // Submit the form
    await page.click('text=Save Entry');

    // Verify success message
    await expect(page.locator('text=Your entry has been saved successfully!')).toBeVisible();

    // Verify entry is saved in the database
    const entry = await db.selectFrom('kilo').selectAll().where('user_id', '=', testUser.id).executeTakeFirst();
    expect(entry).not.toBeNull();
    expect(entry?.q1).toBe('This is my response to question 1');
    expect(entry?.q2).toBe('This is my response to question 2');
    expect(entry?.q3).toBe('This is my response to question 3');
    expect(entry?.user_id).toBe(testUser.id);
  });

  test('shows error when trying to submit required question without an answer', async ({ page }) => {
    // Log in as test user
    await loginAsUser(page);

    // Navigate to Kilo Entry Form
    await page.click('text=Try the KILO Entry Form');

    // Try to submit without answering first question
    await page.click('text=Next');

    // Verify error message is shown
    await expect(page.locator('text=This question is required')).toBeVisible();
  });

});