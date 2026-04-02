import { NextRequest, NextResponse } from "next/server";
import { deleteSessionCookieInBrowser } from "@/lib/auth/browser";
import { invalidateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

// NOTE: This is also accessed when user/admin clicks "Logout" in the UI
export async function POST(request: NextRequest) {

    try {
        // Invalidate session in backend (DB)
        const session = await invalidateSession(request);

        const res = NextResponse.json({ success: true });

        // Delete session cookie in browser
        deleteSessionCookieInBrowser(session, res);
        return res;
    } catch (error) {
        if (error instanceof AppError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        console.error('[LOGOUT]:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred during logout' },
            { status: 500 }
        );
    }
}
