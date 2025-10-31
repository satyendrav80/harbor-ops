import crypto from 'crypto';

// Use environment variable for encryption key, or generate a default (in production, use a proper key)
const ENCRYPTION_KEY_STRING = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32-chars!!';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16
const KEY_LENGTH = 32; // AES-256 requires 32 bytes

// Derive a proper 32-byte key from the string using SHA-256
function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY_STRING).digest();
}

/**
 * Encrypts a string value
 */
export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an encrypted string
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) return encryptedText; // If not encrypted, return as-is
    const iv = Buffer.from(textParts[0], 'hex');
    const encrypted = textParts[1];
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // If decryption fails, return empty string
    return '';
  }
}

