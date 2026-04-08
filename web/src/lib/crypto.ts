import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Returns the 32-byte encryption key from the KILO_ENCRYPTION_KEY env var.
 * Expects a 64-character hex string (256 bits).
 */
function getEncryptionKey(): Buffer {
  const hex = process.env.KILO_ENCRYPTION_KEY;

  if (!hex || hex.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "KILO_ENCRYPTION_KEY environment variable is required in production"
      );
    }
    console.warn(
      "[crypto] WARNING: KILO_ENCRYPTION_KEY is not set. Encryption/decryption will be skipped in development."
    );
    return Buffer.alloc(0);
  }

  if (hex.length !== 64) {
    throw new Error(
      "KILO_ENCRYPTION_KEY must be a 64-character hex string (32 bytes / 256 bits)"
    );
  }

  return Buffer.from(hex, "hex");
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a string in the format: iv:authTag:ciphertext (all hex-encoded).
 * Returns the original text if no encryption key is configured (dev fallback).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (key.length === 0) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a string produced by encrypt().
 * Expects the format: iv:authTag:ciphertext (all hex-encoded).
 * Returns the original string if it doesn't match the encrypted format (unencrypted legacy data).
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  if (key.length === 0) return encryptedText;

  // Check if this looks like encrypted data (iv:authTag:ciphertext, all hex)
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    // Not encrypted — return as-is (legacy unencrypted data)
    return encryptedText;
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  // Validate hex lengths: IV=24 chars, authTag=32 chars, ciphertext > 0
  if (
    ivHex.length !== IV_LENGTH * 2 ||
    authTagHex.length !== AUTH_TAG_LENGTH * 2 ||
    ciphertextHex.length === 0
  ) {
    return encryptedText;
  }

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    // Decryption failed — likely not encrypted data or wrong key
    return encryptedText;
  }
}

/**
 * Encrypts a kilo text field if it's non-null.
 */
export function encryptField(value: string | null | undefined): string | null {
  if (value == null) return null;
  return encrypt(value);
}

/**
 * Decrypts a kilo text field if it's non-null.
 */
export function decryptField(value: string | null | undefined): string | null {
  if (value == null) return null;
  return decrypt(value);
}
