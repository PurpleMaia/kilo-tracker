import { NextRequest, NextResponse } from 'next/server';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { AuthUser, SessionType } from '../../types/auth';
import { deleteTokenInDB, generateToken, hashToken, storeTokenInDB } from './token';
import { CookieStore, getSessionCookieFromBrowser, setSessionCookieInBrowser } from './browser';
import { Errors } from '../errors';
import { db } from '../../db/kysely/client';
import { fetchUserRole } from './login';

/**
 * Helper function to set an expiration date (can edit for more tighter windows)
 * @returns Date object of when the session should expire (today + time)
 */
function getExpirationDate(): Date {
    return new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now
}

/**
 * Core session validation logic - validates a session token and returns user data.
 * @param hashedToken The hashed session token to validate
 * @param sessionType The expected session type ('user' or 'sysadmin')
 * @returns AuthUser object if session is valid
 * @throws Errors.NO_SESSION if session is invalid or expired
 */
const validateSessionCore = async (hashedToken: string, sessionType: SessionType): Promise<AuthUser> => {
    if (process.env.NODE_ENV === "development") console.log('[validateSessionCore] Validating session...');

    // Fetch account data from session token - select only needed columns
    const account = await db.selectFrom('sessions as s')
        .innerJoin('users as u', 's.user_id', 'u.id')
        .select(['u.id', 'u.email', 'u.username', 'u.system_role', 'u.created_at'])
        .where('s.token_hash', '=', hashedToken)
        .where('u.system_role', '=', sessionType)
        .where('s.expires_at', '>', new Date())
        .executeTakeFirst();

    if (!account) {
        throw Errors.NO_SESSION;
    }

    const role = await fetchUserRole(account.id);

    return { ...account, role } as AuthUser;
};

/**
 * Cached session validation for Server Components.
 * Uses React.cache() to deduplicate within a single request - multiple components
 * calling this function will only trigger ONE database query per request.
 *
 * Important: This is NOT cross-request caching. Each new page load validates fresh.
 *
 * @returns AuthUser if session is valid
 * @throws Errors.NO_SESSION if session is invalid or missing
 */
export const getAuthUser = cache(async (): Promise<AuthUser> => {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookieFromBrowser(cookieStore);

    if (!sessionCookie) {
        throw Errors.NO_SESSION;
    }

    const hashedToken = hashToken(sessionCookie.token);
    return validateSessionCore(hashedToken, sessionCookie.type);
});

/**
 * Creates a new user session.
 * Generates a token, stores its hash in the database, and sets a session cookie in the browser.
 * @param userID The ID of the user for whom the session is created.
 * @param sessionType The type of session (e.g., 'user' or 'sysadmin').
 * @param response The NextResponse object to which the session cookie will be attached.
 * @returns A promise that resolves to the modified NextResponse containing the session cookie.
 */
export async function createSession(userID: string, sessionType: SessionType, response: NextResponse): Promise<NextResponse<unknown>> {
    const expiresAt = getExpirationDate();
    const { rawToken, hashedToken } = await generateToken();

    await storeTokenInDB(userID, hashedToken, expiresAt);

    const res = setSessionCookieInBrowser(sessionType, response, rawToken, expiresAt);    
    return res;
}

/**
 * Gets the raw token from browser cookies, then finds the hashed version in the DB.
 * Uses React.cache() internally to avoid redundant database queries during a single request.
 * @param request NextRequest object
 * @returns AuthUser (all user data needed for application)
 * @throws Errors.NO_SESSION if the session cookie is missing or invalid
 */
export async function validateSession(request: NextRequest): Promise<AuthUser> {
    const sessionCookie = getSessionCookieFromBrowser(request);
    
    if (!sessionCookie) {
        throw Errors.NO_SESSION;
    }

    const hashedToken = hashToken(sessionCookie.token);
    return validateSessionCore(hashedToken, sessionCookie.type);
}

/**
 * Validates a session using a provided CookieStore (e.g., server-side cookie object).
 * Uses React.cache() internally to avoid redundant database queries during a single request.
 * @param cookieStore The CookieStore containing session cookies.
 * @returns A promise that resolves to an AuthUser if the session is valid.
 * @throws Errors.NO_SESSION if the session cookie is missing or invalid.
 */
export async function validateSessionFromCookies(cookieStore: CookieStore): Promise<AuthUser> {
    const sessionCookie = getSessionCookieFromBrowser(cookieStore);
    if (!sessionCookie) {
        throw Errors.NO_SESSION;
    }

    const hashedToken = hashToken(sessionCookie.token);
    return validateSessionCore(hashedToken, sessionCookie.type);
}

/**
 * Gets the session token from browser, then deletes the hashed version in the DB
 * @param request NextRequest object
 */
export async function invalidateSession(request: NextRequest): Promise<SessionType> {
    const sessionCookie = getSessionCookieFromBrowser(request);
    if (!sessionCookie) {
        throw Errors.NO_SESSION;
    }
    
    const hashedToken = hashToken(sessionCookie.token);
    await deleteTokenInDB(hashedToken);

    return sessionCookie.type;

    // Note: Cookie deletion from browser is handled in the route handler
}
