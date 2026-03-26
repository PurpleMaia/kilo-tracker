import { test, expect } from '@playwright/test';
import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { randomInt, randomUUID } from 'crypto';
import { clearFailedLoginAttempts, dismissInstallDialog } from '../helpers';

/**
 * E2E Data Isolation Tests
 *
 * These tests verify that users cannot see or access other users' data.
 * Critical security tests for multi-tenant data isolation.
 */

const randomSuffix1 = randomInt(1000, 9999);
const randomSuffix2 = randomInt(1000, 9999);

const userA = {
  id: randomUUID(),
  email: `usera-${randomSuffix1}@example.com`,
  username: `usera${randomSuffix1}`,
  password: 'TestPassword123!',
};

const userB = {
  id: randomUUID(),
  email: `userb-${randomSuffix2}@example.com`,
  username: `userb${randomSuffix2}`,
  password: 'TestPassword123!',
};

test.describe.configure({ mode: 'serial' });

test.describe('Data Isolation Security', () => {
  // Clear login attempts before each test to prevent rate limiting from parallel tests
  test.beforeEach(async () => {
    await clearFailedLoginAttempts();
  });

  test.beforeAll(async () => {
    // Clear any failed login attempts from other tests to avoid rate limiting
    await clearFailedLoginAttempts();

    // Create both test users
    const passwordHashA = await hashPassword(userA.password);
    const passwordHashB = await hashPassword(userB.password);

    await db.insertInto('users').values({
      id: userA.id,
      email: userA.email,
      username: userA.username,
      password_hash: passwordHashA,
      system_role: 'user',
    }).execute();

    await db.insertInto('users').values({
      id: userB.id,
      email: userB.email,
      username: userB.username,
      password_hash: passwordHashB,
      system_role: 'user',
    }).execute();

    // Create KILO entries for each user with distinct content
    await db.insertInto('kilo').values({
      user_id: userA.id,
      q1: 'User A Secret Entry - Private Data',
      q2: 'User A Q2 Answer',
      q3: null,
    }).execute();

    await db.insertInto('kilo').values({
      user_id: userB.id,
      q1: 'User B Secret Entry - Different Private Data',
      q2: 'User B Q2 Answer',
      q3: null,
    }).execute();
  });

  test.afterAll(async () => {
    // Clean up in correct order (sessions first due to FK constraints)
    await db.deleteFrom('sessions').where('user_id', 'in', [userA.id, userB.id]).execute();
    await db.deleteFrom('kilo').where('user_id', 'in', [userA.id, userB.id]).execute();
    await db.deleteFrom('users').where('id', 'in', [userA.id, userB.id]).execute();
    await db.destroy();
  });

  test('User A should only see their own entries on dashboard', async ({ page }) => {
    // Login as User A
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input#identifier', { state: 'visible' });

    await page.fill('input#identifier', userA.email);
    await page.fill('input#password', userA.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await page.waitForSelector('text=Your KILO Entries', { state: 'visible' });

    // Verify User A sees their own entry
    await expect(page.locator('text=User A Secret Entry')).toBeVisible();

    // Verify User A does NOT see User B's entry
    await expect(page.locator('text=User B Secret Entry')).not.toBeVisible();
  });

  test('User B should only see their own entries on dashboard', async ({ page }) => {
    // Login as User B
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input#identifier', { state: 'visible' });

    await page.fill('input#identifier', userB.email);
    await page.fill('input#password', userB.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await page.waitForSelector('text=Your KILO Entries', { state: 'visible' });

    // Verify User B sees their own entry
    await expect(page.locator('text=User B Secret Entry')).toBeVisible();

    // Verify User B does NOT see User A's entry
    await expect(page.locator('text=User A Secret Entry')).not.toBeVisible();
  });

  test('User A cannot access User B entry via direct URL manipulation', async ({ page }) => {
    // First, get User B's entry ID
    const userBEntry = await db.selectFrom('kilo')
      .select(['id'])
      .where('user_id', '=', userB.id)
      .executeTakeFirst();

    expect(userBEntry).toBeDefined();

    // Login as User A
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Dismiss install dialog if it appears on login page
    await dismissInstallDialog(page);

    await page.waitForSelector('input#identifier', { state: 'visible' });

    await page.fill('input#identifier', userA.email);
    await page.fill('input#password', userA.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await dismissInstallDialog(page);

    // Try to access User B's entry via edit URL
    await page.goto(`/kilo?edit=${userBEntry!.id}`);
    await page.waitForLoadState('networkidle');

    // The page should either:
    // 1. Redirect away from the edit page
    // 2. Show an error message
    // 3. Not display User B's data

    // Wait a moment for any redirects or error messages
    await page.waitForTimeout(1000);

    // Verify we don't see User B's private data
    await expect(page.locator('text=User B Secret Entry')).not.toBeVisible();
    await expect(page.locator('text=User B Q2 Answer')).not.toBeVisible();
  });

  test('API should not return other users entries', async ({ page, request }) => {
    // Login as User A to get session cookie
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input#identifier', { state: 'visible' });

    await page.fill('input#identifier', userA.email);
    await page.fill('input#password', userA.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    // Get the session cookie
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session_token');
    expect(sessionCookie).toBeDefined();

    // Make API request to get all entries
    const response = await request.get('https://localhost:3000/api/kilo?limit=50', {
      headers: {
        Cookie: `session_token=${sessionCookie!.value}`,
      },
      ignoreHTTPSErrors: true,
    });

    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.entries).toBeDefined();

    // Verify no entries belong to User B
    const hasUserBEntry = data.entries.some(
      (entry: { q1: string | null }) => entry.q1?.includes('User B')
    );
    expect(hasUserBEntry).toBe(false);

    // Verify User A's entries are present
    const hasUserAEntry = data.entries.some(
      (entry: { q1: string | null }) => entry.q1?.includes('User A')
    );
    expect(hasUserAEntry).toBe(true);
  });

  test('API should reject attempts to fetch other users entry by ID', async ({ page, request }) => {
    // Get User B's entry ID
    const userBEntry = await db.selectFrom('kilo')
      .select(['id'])
      .where('user_id', '=', userB.id)
      .executeTakeFirst();

    expect(userBEntry).toBeDefined();

    // Login as User A
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input#identifier', { state: 'visible' });

    await page.fill('input#identifier', userA.email);
    await page.fill('input#password', userA.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session_token');

    // Try to fetch User B's entry via API
    const response = await request.get(`https://localhost:3000/api/kilo?id=${userBEntry!.id}`, {
      headers: {
        Cookie: `session_token=${sessionCookie!.value}`,
      },
      ignoreHTTPSErrors: true,
    });

    // Should return 404 (not found or not authorized)
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Entry not found or not authorized');
  });

  test('API should reject attempts to update other users entry', async ({ page, request }) => {
    // Get User B's entry ID
    const userBEntry = await db.selectFrom('kilo')
      .select(['id', 'q1'])
      .where('user_id', '=', userB.id)
      .executeTakeFirst();

    expect(userBEntry).toBeDefined();
    const originalQ1 = userBEntry!.q1;

    // Login as User A
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input#identifier', { state: 'visible' });

    await page.fill('input#identifier', userA.email);
    await page.fill('input#password', userA.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session_token');

    // Try to update User B's entry via API
    const response = await request.put('https://localhost:3000/api/kilo', {
      headers: {
        Cookie: `session_token=${sessionCookie!.value}`,
        'Content-Type': 'application/json',
      },
      data: {
        id: userBEntry!.id,
        q1: 'HACKED BY USER A',
      },
      ignoreHTTPSErrors: true,
    });

    // Should return 404 (not found or not authorized)
    expect(response.status()).toBe(404);

    // Verify the original data is unchanged
    const unchangedEntry = await db.selectFrom('kilo')
      .select(['q1'])
      .where('id', '=', userBEntry!.id)
      .executeTakeFirst();

    expect(unchangedEntry!.q1).toBe(originalQ1);
  });

  test('API should reject attempts to delete other users entry', async ({ page, request }) => {
    // Get User B's entry ID
    const userBEntry = await db.selectFrom('kilo')
      .select(['id'])
      .where('user_id', '=', userB.id)
      .executeTakeFirst();

    expect(userBEntry).toBeDefined();

    // Login as User A
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input#identifier', { state: 'visible' });

    await page.fill('input#identifier', userA.email);
    await page.fill('input#password', userA.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session_token');

    // Try to delete User B's entry via API
    const response = await request.delete('https://localhost:3000/api/kilo', {
      headers: {
        Cookie: `session_token=${sessionCookie!.value}`,
        'Content-Type': 'application/json',
      },
      data: {
        id: userBEntry!.id,
      },
      ignoreHTTPSErrors: true,
    });

    // Should return 404 (not found or not authorized)
    expect(response.status()).toBe(404);

    // Verify the entry still exists
    const stillExists = await db.selectFrom('kilo')
      .select(['id'])
      .where('id', '=', userBEntry!.id)
      .executeTakeFirst();

    expect(stillExists).toBeDefined();
  });
});
