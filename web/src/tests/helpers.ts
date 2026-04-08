import { Page } from '@playwright/test';
import { db } from '@/db/kysely/client';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

// ============================================================================
// Test Data Types
// ============================================================================

export type TestAdmin = {
  id: string;
  email: string;
  username: string;
  password: string;
  passHash: string;
  system_role: 'sysadmin';
  sysadmin_token: string;
};

export type TestOrg = {
  id: string;
  name: string;
  slug: string;
};

export type TestUser = {
  id: string;
  email: string;
  username: string;
  password: string;
  passHash: string;
  system_role: 'user';
  session_token: string;
};

// ============================================================================
// Test Data Factory Functions - Generate unique test data per test file
// ============================================================================

/**
 * Generate a unique test user for isolated test runs
 * Each test file gets its own unique user to prevent conflicts
 */
export function createTestUser(): TestUser {
  const uniqueId = randomUUID();
  const suffix = uniqueId.slice(0, 8);
  return {
    id: uniqueId,
    email: `test-user-${suffix}@example.com`,
    username: `testuser${suffix}`,
    password: 'TestPassword123!',
    passHash: '',
    system_role: 'user',
    session_token: `valid-session-token-${suffix}`,
  };
}

/**
 * Generate a unique test admin for isolated test runs
 */
export function createTestAdmin(): TestAdmin {
  const uniqueId = randomUUID();
  const suffix = uniqueId.slice(0, 8);
  return {
    id: uniqueId,
    email: `test-admin-${suffix}@example.com`,
    username: `testadmin${suffix}`,
    password: 'AdminPassword123!',
    passHash: '',
    system_role: 'sysadmin',
    sysadmin_token: `valid-sysadmin-token-${suffix}`,
  };
}

/**
 * Generate a unique test organization for isolated test runs
 */
export function createTestOrg(): TestOrg {
  const uniqueId = randomUUID();
  const suffix = uniqueId.slice(0, 8);
  return {
    id: uniqueId,
    name: `Test Organization ${suffix}`,
    slug: `test-org-${suffix}`,
  };
}

// ============================================================================
// Static Test Data - For backwards compatibility (use factory functions for new tests)
// These are created once per module load, so they're unique per test file
// ============================================================================

export const testUser: TestUser = createTestUser();
export const testAdmin: TestAdmin = createTestAdmin();
export const testOrg: TestOrg = createTestOrg();

// ============================================================================
// Mock Request Helpers
// ============================================================================

/**
 * Creates a mock NextRequest for POST endpoints
 * @param body - The request body
 * @param headers - Additional headers to include
 * @param cookies - Cookies to include in the request
 */
export function createMockRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {}
): NextRequest {
  const url = 'http://localhost:3000/api/test';

  const defaultHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'jest-test-runner',
    'x-forwarded-for': '127.0.0.1',
    ...headers,
  };

  const request = new NextRequest(url, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  });

  // Mock the cookies API
  const cookieStore = new Map<string, string>(Object.entries(cookies));

  Object.defineProperty(request, 'cookies', {
    value: {
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value ? { name, value } : undefined;
      },
      getAll: () => {
        return Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value }));
      },
      has: (name: string) => cookieStore.has(name),
      set: (name: string, value: string) => cookieStore.set(name, value),
      delete: (name: string) => cookieStore.delete(name),
    },
    writable: false,
  });

  return request;
}

/**
 * Creates a mock NextRequest for GET endpoints
 * @param url - The full URL including query parameters
 * @param params - Query parameters to add to the URL
 */
export function createMockGetRequest(
  url: string,
  params: Record<string, string> = {}
): NextRequest {
  const urlObj = new URL(url);

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const request = new NextRequest(urlObj.toString(), {
    method: 'GET',
    headers: {
      'user-agent': 'jest-test-runner',
      'x-forwarded-for': '127.0.0.1',
    },
  });

  return request;
}

/**
 * Creates an authenticated NextRequest with a session cookie.
 * Useful for route tests that require validateSession(request).
 */
export function createAuthedRequest(
  url: string,
  token: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown> | string | FormData;
    ip?: string;
    cookieName?: 'session_token' | 'sysadmin_token';
  } = {}
): NextRequest {
  const {
    method = 'GET',
    headers = {},
    body,
    ip = '127.0.0.1',
    cookieName = 'session_token',
  } = options;

  const isStringBody = typeof body === 'string';
  const hasJsonBody = body !== undefined && !isStringBody;

  const request = new NextRequest(url, {
    method,
    headers: {
      'user-agent': 'jest-test-runner',
      'x-forwarded-for': ip,
      cookie: `${cookieName}=${token}`,
      ...(hasJsonBody ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isStringBody ? body : JSON.stringify(body),
  });

  return request;
}

/**
 * Helper function to clear all failed login attempts
 * Clears ALL failed attempts to prevent cross-test rate limiting in parallel test execution
 * This is necessary because all tests share the same IP (localhost) in the test environment
 */
export async function clearFailedLoginAttempts(adminEmail?: string) {
  if (adminEmail) {
    // Clear attempts for specific admin
    await db.deleteFrom('login_attempts')
      .where('identifier', '=', adminEmail)
      .where('successful', '=', false)
      .execute();
  } else {
    // Clear all failed attempts (used by test suites to prevent cross-suite interference)
    await db.deleteFrom('login_attempts')
      .where('successful', '=', false)
      .execute();
  }
}

/**
* Helper function to logout
* Handles cases where user may already be logged out
*/
export async function logout(page: Page) {
  try {
    // Check if logout link is visible (admin mode)
    const adminLogoutLink = page.locator('a[href="/api/auth/logout"]');
    const isAdminLogoutVisible = await adminLogoutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (isAdminLogoutVisible) {
      await adminLogoutLink.click();
      await page.waitForLoadState('networkidle');
      return;
    }

    // Check if Avatar dropdown exists (dashboard mode)
    const avatarButton = page.locator('button').filter({ hasText: /▾/ }).first();
    const isAvatarVisible = await avatarButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (isAvatarVisible) {
      // Open dropdown
      await avatarButton.click();
      // Wait for dropdown to open
      await page.waitForTimeout(300);
      // Click logout button in dropdown
      const logoutButton = page.locator('button').filter({ hasText: /^logout$/i });
      await logoutButton.click();
      await page.waitForLoadState('networkidle');
      return;
    }

    // If no logout option found, user is likely already logged out or on login page
    // This is not an error state
  } catch (error) {
    // Silently handle errors - user might already be logged out
    console.log('Logout helper: User may already be logged out');
  }
}

/**
 * Helper function to dismiss the "Install KILO App" dialog if it appears
 * Uses "Don't show again" to prevent dialog from reappearing during the test session
 */
export async function dismissInstallDialog(page: Page) {
  try {
    // Wait for the dialog to potentially appear (it has a 2s delay after page load)
    // We need to wait longer to ensure we catch it
    await page.waitForTimeout(2500);

    // Check if the sheet dialog is visible
    const dialog = page.locator('[role="dialog"][data-slot="sheet-content"]');
    const isDialogVisible = await dialog.isVisible({ timeout: 500 }).catch(() => false);

    if (isDialogVisible) {
      // Click "Don't show again" to permanently dismiss for this session via localStorage
      const dontShowBtn = page.locator('button').filter({ hasText: /show again/i });
      if (await dontShowBtn.isVisible({ timeout: 500 })) {
        await dontShowBtn.click();
      } else {
        // Fallback to "Maybe later" if "Don't show again" not found
        const maybeLaterBtn = page.locator('button').filter({ hasText: /maybe later/i });
        if (await maybeLaterBtn.isVisible({ timeout: 500 })) {
          await maybeLaterBtn.click();
        }
      }
      // Wait for sheet animation to complete (Radix Sheet has 500ms animation)
      await page.waitForTimeout(700);
      // Wait for dialog to disappear
      await dialog.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
    }
  } catch {
    // Dialog not present, continue
  }
}

/**
 * Helper function to login as regular user
 */
export async function loginAsUser(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input#identifier', { state: 'visible' });
  await page.fill('input#identifier', testUser.email);
  await page.fill('input#password', testUser.password);

  await Promise.all([
    page.waitForURL(/.*dashboard(?!\/login)/, { timeout: 10000 }),
    page.click('button[type="submit"]')
  ]);

  await page.waitForLoadState('networkidle');

  // Dismiss the install dialog if it appears
  await dismissInstallDialog(page);
}

/**
 * Helper function to navigate to test client details page
 * Assumes admin is already logged in
 */
export async function navigateToClientDetails(page: Page, org: TestOrg) {
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');

  const clientLink = page.locator(`a:has-text("${org.name}")`).first();
  await clientLink.click();

  await page.waitForURL(/\/admin\/clients\/[^/]+$/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  return page.url().match(/\/admin\/clients\/([a-f0-9-]+)/)?.[1];
}
