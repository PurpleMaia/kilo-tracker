import { db } from '../../db/kysely/client';
import { createHash, randomBytes } from 'crypto';

// == Token Management Functions ==
/**
 * Generates a cryptographically secure random token and its SHA-256 hash.
 * @returns An object containing the raw token string and its hashed representation.
 */
export async function generateToken(): Promise<{ rawToken: string; hashedToken: string }> {

  const rawToken = randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);

  return { rawToken, hashedToken };
}

/**
 * Creates a SHA-256 hash of a raw token.
 * @param rawToken The raw token string to hash.
 * @returns The hexadecimal representation of the SHA-256 hash.
 */
export function hashToken(rawToken: string): string {
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    return hashedToken;
}

// == DB Cookie Management Functions == 
/**
 * Stores a hashed session token in the database with an expiration date.
 * @param userId The ID of the user the token belongs to.
 * @param hashedToken The SHA-256 hashed token value.
 * @param expiresAt The Date when the token should expire.
 */
export async function storeTokenInDB(userId: string, hashedToken: string, expiresAt: Date): Promise<void> {
    const result = await db
        .insertInto('sessions')
        .values({ 
            token_hash: hashedToken,
            expires_at: expiresAt,
            user_id: userId,
        })    
        .executeTakeFirst();

    if (!result) {
        throw new Error('SESSION_INSERTION_FAILED');
    }
}

/**
 * Deletes a session token from the database.
 * @param hashedToken The SHA-256 hashed token to delete.
 */
export async function deleteTokenInDB(hashedToken: string): Promise<void> {
    await db
        .deleteFrom('sessions')
        .where('token_hash', '=', hashedToken)
    .execute();
}