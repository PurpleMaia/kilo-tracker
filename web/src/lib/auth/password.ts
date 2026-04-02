import * as argon2 from 'argon2';

/**
 * Gets the password hash secret from environment.
 * Throws an error in production if the secret is not configured.
 */
function getHashSecret(): Buffer {
    const secret = process.env.PASSWORD_HASH_SECRET;

    if (!secret || secret.trim() === '') {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('PASSWORD_HASH_SECRET environment variable is required in production');
        }
        console.warn('[password] WARNING: PASSWORD_HASH_SECRET is not set. Using empty secret for development only.');
    }

    return Buffer.from(secret || '', 'utf-8');
}

/**
 * Hashes a plaintext password using Argon2id.
 * @param password The plaintext password to hash.
 * @returns A promise that resolves to the hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password,
        {
            type: argon2.argon2id,
            secret: getHashSecret(),
        });
}

/**
 * Verifies a plaintext password against a stored Argon2id hash.
 * @param storedHash The hashed password to compare against.
 * @param password The plaintext password provided by the user.
 * @returns A promise that resolves to true if the password matches the hash, otherwise false.
 */
export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
    // OAuth users have placeholder hashes that start with "oauth:" - these should never verify
    if (storedHash.startsWith('oauth:')) {
        return false;
    }

    return argon2.verify(storedHash, password,
        {
            secret: getHashSecret(),
        });
}