import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { test, expect } from '@playwright/test';
import { testUser, loginAsUser, dismissInstallDialog } from '../helpers';
import { randomUUID } from 'crypto';

test.describe.configure({ mode: 'serial' });

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

    // Create a complete profile so the user can access the KILO form
    await db.insertInto('profiles').values({
      id: randomUUID(),
      user_id: testUser.id,
      first_name: 'Test',
      last_name: 'User',
      dob: new Date('1990-01-01'),
      mauna: 'Mauna Kea',
      aina: 'Hawaiʻi Island',
      wai: 'Wailuku River',
      kula: 'Test School',
      role: 'Haumāna',
    }).execute();
  });

  // Clean up kilo entries before each test to ensure data isolation
  test.beforeEach(async () => {
    await db.deleteFrom('kilo').where('user_id', '=', testUser.id).execute();
  });

  test.afterAll(async () => {
    // Clean up kilo entry
    await db.deleteFrom('kilo').where('user_id', '=', testUser.id).execute();

    // Clean up profile
    await db.deleteFrom('profiles').where('user_id', '=', testUser.id).execute();

    // Clean up test user from the database
    await db.deleteFrom('users').where('id', '=', testUser.id).execute();
  });

  test('allows a user to submit a kilo entry with all required questions', async ({ page }) => {
    // Log in as test user
    await loginAsUser(page);

    // Navigate to Kilo Entry Form
    await page.click('text=Start a new KILO');

    // Dismiss install dialog if it appears on the kilo page
    await dismissInstallDialog(page);

    // Use text input instead of audio (audio recording may not work in headless browsers)
    const preferToTypeBtn = page.locator('text=Prefer to type instead?');
    await expect(preferToTypeBtn).toBeVisible();
    await preferToTypeBtn.click();

    // Wait for textarea to appear and fill in Q1
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('This is my response to question 1');
    await page.click('text=Next');

    // Answer Q2 (required)
    await preferToTypeBtn.click();
    await expect(textarea).toBeVisible();
    await textarea.fill('This is my response to question 2');
    await page.click('text=Next');

    // Answer Q3 (required)
    await preferToTypeBtn.click();
    await expect(textarea).toBeVisible();
    await textarea.fill('This is my response to question 3');

    // Submit the form
    await page.click('text=Save Entry');

    // Wait for navigation to dashboard after saving
    await page.waitForURL('/dashboard');
    // Wait for the entry list to load
    await page.waitForSelector('text=Your KILO Entries');

    // Verify entry is saved in the database
    const entry = await db.selectFrom('kilo').selectAll().where('user_id', '=', testUser.id).executeTakeFirst();
    expect(entry).not.toBeNull();
    expect(entry?.q1).toBe('This is my response to question 1');
    expect(entry?.q2).toBe('This is my response to question 2');
    expect(entry?.q3).toBe('This is my response to question 3');
    expect(entry?.user_id).toBe(testUser.id);

    // Verify entry appears in the entry list on the dashboard
    await expect(page.locator('p:has-text("This is my response to question 1")').first()).toBeVisible();
  });

  test('allows a user to submit a kilo entry with text only', async ({ page }) => {
    // Log in as test user
    await loginAsUser(page);

    // Navigate to Kilo Entry Form
    await page.click('text=Start a new KILO');

    // Dismiss install dialog if it appears on the kilo page
    await dismissInstallDialog(page);

    // Skip audio recording and answer questions with text
    // Wait for "Prefer to type instead?" button to be visible
    const preferToTypeBtn = page.locator('text=Prefer to type instead?');
    await expect(preferToTypeBtn).toBeVisible();
    await preferToTypeBtn.click();

    // Wait for textarea to appear and fill in Q1
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('This is my response to question 1');

    // Click Next to move to Q2
    await page.click('text=Next');

    // Dismiss install dialog if it appears
    await dismissInstallDialog(page);

    // Wait for the question to change to Q2 (use the progress indicator "2 / 3")
    await expect(page.locator('text=2 / 3')).toBeVisible();

    // Click "Prefer to type instead?" for Q2
    await preferToTypeBtn.click();
    await expect(textarea).toBeVisible();
    await textarea.fill('This is my response to question 2');

    // Click Next to move to Q3
    await page.click('text=Next');

    // Wait for the question to change to Q3 (use the progress indicator "3 / 3")
    await expect(page.locator('text=3 / 3')).toBeVisible();

    // Click "Prefer to type instead?" for Q3
    await preferToTypeBtn.click();
    await expect(textarea).toBeVisible();
    await textarea.fill('This is my response to question 3');

    // Submit the form
    await page.click('text=Save Entry');

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');

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
    await page.click('text=Start a new KILO');

    // Dismiss install dialog if it appears on the kilo page
    await dismissInstallDialog(page);

    // Try to submit without answering first question
    await page.click('text=Next');

    // Verify error message is shown
    await expect(page.locator('text=This question is required')).toBeVisible();
  });

  test('user can edit an existing entry and see updated content in the entry list', async ({ page }) => {
    // Log in as test user
    await loginAsUser(page);

    // Create a kilo entry directly in the database for editing with unique content
    const entryId = await db.insertInto('kilo').values({
      user_id: testUser.id,
      q1: 'Edit Test Original Q1',
      q2: 'Edit Test Original Q2',
      q3: 'Edit Test Original Q3',
    }).returning('id').executeTakeFirst();

    // Navigate to home/dashboard
    await page.goto('/dashboard');
    // Wait for the entry list to load
    await page.waitForSelector('text=Your KILO Entries');

    // Wait for the entry to appear before clicking edit
    await expect(page.locator('text=Edit Test Original Q1')).toBeVisible();

    // Click edit button for the created entry
    await page.click(`a[href="/kilo?edit=${entryId?.id}"]`);

    // Wait for form to load with existing entry data
    await page.waitForSelector('textarea');
    await expect(page.locator('textarea')).toHaveValue('Edit Test Original Q1');

    // Update the answer to question 1 and submit
    await page.fill('textarea', 'Edit Test Updated Q1');
    await page.click('text=Next');
    await page.click('text=Next');
    await page.click('text=Update Entry');

    // Wait for navigation to dashboard after saving
    await page.waitForURL('/dashboard');
    // Wait for the entry list to load
    await page.waitForSelector('text=Your KILO Entries');

    // Verify the updated entry appears in the entry list
    // The entry content appears after "Question 1:" label in the card
    await expect(page.locator('p:has-text("Edit Test Updated Q1")').first()).toBeVisible();
    await expect(page.locator('p:has-text("Edit Test Original Q2")').first()).toBeVisible();
    await expect(page.locator('p:has-text("Edit Test Original Q3")').first()).toBeVisible();
  });

  test('user can delete an existing entry and it no longer appears in the entry list', async ({ page }) => {
    // Log in as test user
    await loginAsUser(page);

    // Create a kilo entry directly in the database for deleting
    const entryId = await db.insertInto('kilo').values({
      user_id: testUser.id,
      q1: 'Entry to be deleted',
    }).returning('id').executeTakeFirst();

    // Navigate to home/dashboard
    await page.goto('/dashboard');
    // Wait for the entry list to load
    await page.waitForSelector('text=Your KILO Entries');

    // Wait for the specific entry to be visible on the page
    const entryText = page.locator('text=Entry to be deleted');
    await expect(entryText).toBeVisible();

    // Find the delete button within the same card that contains "Entry to be deleted"
    // by traversing up to the card and then finding the delete button within it
    const entryCard = entryText.locator('xpath=ancestor::div[contains(@class, "group")]');
    const deleteButton = entryCard.locator('#delete-kilo-button');

    // Click the delete button
    await deleteButton.click();

    // Wait for the delete operation to complete and the entry to be removed from the list
    await expect(entryText).not.toBeVisible();

    // Verify the entry is deleted from the database
    const entry = await db.selectFrom('kilo').selectAll().where('id', '=', entryId!.id).executeTakeFirst();
    expect(entry).toBeUndefined();
  });

});