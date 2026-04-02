import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth/login";
import { AppError } from "@/lib/errors";
import { createSessionWithToken } from "@/lib/auth/session";
import { checkLoginRateLimit, getClientIP, getUserAgent, recordLoginAttempt, clearFailedAttempts } from "@/lib/auth/rate-limit";
import { loginSchema, loginSchemaLenient } from "@kilo/shared/schemas";

// Use lenient schema in dev (skips identifier format validation)
const activeLoginSchema = process.env.NODE_ENV === "production" ? loginSchema : loginSchemaLenient;

// could throw Zod Login Schema related, TOO_MANY_REQUESTS, INVALID_CREDENTIALS, INTERNAL_SERVER_ERROR
export async function POST(request: NextRequest) {
  // console.log('[LOGIN] Login attempt received.');

  // Extract metadata for login rate limiting
  const ip = getClientIP(request);
  const userAgent = getUserAgent(request);
  // console.log('[LOGIN] Client IP:', ip, ' | User-Agent:', userAgent);

  // Validate and safe parse input
  const { credentials } = await request.json();
  const parsed = activeLoginSchema.safeParse(credentials);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { identifier, password } = parsed.data;

  try {
      // Check rate limit
      await checkLoginRateLimit(ip, identifier);

      // Login user/admin and generate response to be returned after setting cookie
      const user = await login(identifier, password);

      // Clear failed attempts and record successful login
      await clearFailedAttempts(ip, identifier);
      await recordLoginAttempt(ip, userAgent, identifier, true);

      const sessionType = user.system_role;
      const res = NextResponse.json({ user }, { status: 200 });
      const { response: sessionSetResponse, rawToken } = await createSessionWithToken(user.id, sessionType, res);

      if (process.env.NODE_ENV !== "production") {
          console.log('[LOGIN] Logged in successfully');
      }
      const finalRes = NextResponse.json({ user, token: rawToken, tokenType: sessionType }, { status: 200 });
      sessionSetResponse.headers.forEach((value: string, key: string) => finalRes.headers.set(key, value));
      return finalRes;
  } catch (error) {
      if (error instanceof AppError) {
            // Record failed login attempt if not due to rate limit (which is handled in checkLoginRateLimit)
            if (error.code !== 'TOO_MANY_REQUESTS') {
              await recordLoginAttempt(ip, userAgent, identifier, false, error.message);
            } else {
              console.warn(`[LOGIN] Failed too many login attempts for Identifier: ${identifier}`);
            }
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

    console.error('[LOGIN]', error);
    await recordLoginAttempt(ip, userAgent, identifier, false, 'Internal Server Error');
    return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
    );
  }
}   