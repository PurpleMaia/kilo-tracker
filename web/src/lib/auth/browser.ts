import { SessionCookie, SessionType } from '@/types/auth';
import { NextRequest, NextResponse } from 'next/server';

const USER_COOKIE_NAME = 'session_token';
const SYSADMIN_COOKIE_NAME = 'sysadmin_token'

export type CookieStore = {
    get: (name: string) => { value: string } | undefined;
};

/**
 * Searches browser for a system admin cookie, then a user cookie, if neither exist, then returns null
 * @param request NextRequest object
 * @returns existing session cookie token
 */
export function getSessionCookieFromBrowser(requestOrCookies: NextRequest | CookieStore): SessionCookie | null {
    const cookieStore = 'cookies' in requestOrCookies ? requestOrCookies.cookies : requestOrCookies;
    const sysAdminCookie = cookieStore.get(SYSADMIN_COOKIE_NAME)
    if (sysAdminCookie) {
        return {
            type: 'sysadmin' as SessionType,
            token: sysAdminCookie.value,
        }
    }

    const userCookie = cookieStore.get(USER_COOKIE_NAME)
    if (userCookie) {
        return {
            type: 'user' as SessionType,
            token: userCookie.value,
        }
    }

    return null;
}

/**
 * Determines which session cookie to set in the browser and returns the newly formed response
 * @param type session type for setting the proper cookie (sysadmin or user)
 * @param response current response that needs to be set with the cookie
 * @param rawToken raw generated token to be set in the browser
 * @param expiresAt expiration date for this cookie
 * @returns new response with new session cookie
 */
export function setSessionCookieInBrowser(type: SessionType, response: NextResponse, rawToken: string, expiresAt: Date): NextResponse<unknown> {
    const cookieName = type === 'sysadmin' ? SYSADMIN_COOKIE_NAME : USER_COOKIE_NAME
    response.cookies.set(cookieName, rawToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: expiresAt,
        path: "/"
    });

    return response;
}

/**
 * Deletes an existing session cookie by setting max age to 0
 * @param type session type to search for in the current cookies
 * @param response new response with deleted session cookie
 */
export function deleteSessionCookieInBrowser(type: SessionType, response: NextResponse): void {
    const cookieName = type === 'sysadmin' ? SYSADMIN_COOKIE_NAME : USER_COOKIE_NAME
    response.cookies.set(cookieName, "", {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 0,
        path: "/"
    });
}
