import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto'

/**
 * Encryption utilities for securing OAuth tokens at rest
 * and signing OAuth state parameters.
 *
 * Uses AES-256-GCM for token encryption and HMAC-SHA256 for state signing.
 * Requires TOKEN_ENCRYPTION_KEY env var: 64 hex characters (= 32 bytes).
 */

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(key, 'hex')
}

// ─── Token Encryption (AES-256-GCM) ────────────────────────────────────────

/**
 * Encrypt a plaintext string.
 * Returns a string in format: `iv:authTag:ciphertext` (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

/**
 * Decrypt an encrypted string (format: `iv:authTag:ciphertext`).
 * Returns the original plaintext.
 */
export function decrypt(encryptedValue: string): string {
  const key = getEncryptionKey()
  const parts = encryptedValue.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format. Expected iv:authTag:ciphertext')
  }

  const [ivHex, authTagHex, ciphertext] = parts
  const iv = Buffer.from(ivHex!, 'hex')
  const authTag = Buffer.from(authTagHex!, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext!, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Check if a value looks like it's already encrypted (format: hex:hex:hex).
 * Used during migration to avoid double-encrypting legacy plaintext tokens.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  if (parts.length !== 3) return false
  return parts.every((p) => /^[0-9a-f]+$/i.test(p!))
}

// ─── OAuth State Signing (HMAC-SHA256) ──────────────────────────────────────

/**
 * Sign an OAuth state payload with HMAC-SHA256.
 * Returns: `base64urlPayload.hmacSignature`
 */
export function signState(payload: string): string {
  const key = getEncryptionKey()
  const encoded = Buffer.from(payload).toString('base64url')
  const signature = createHmac('sha256', key).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

/**
 * Verify and decode a signed OAuth state.
 * Returns the original payload string, or throws on invalid/tampered state.
 */
export function verifyState(signedState: string): string {
  const key = getEncryptionKey()
  const dotIndex = signedState.lastIndexOf('.')

  if (dotIndex === -1) {
    throw new Error('Invalid state format: missing signature')
  }

  const encoded = signedState.substring(0, dotIndex)
  const signature = signedState.substring(dotIndex + 1)

  const expectedSignature = createHmac('sha256', key).update(encoded).digest('base64url')

  if (signature !== expectedSignature) {
    throw new Error('Invalid state: HMAC signature mismatch (possible tampering)')
  }

  return Buffer.from(encoded, 'base64url').toString('utf-8')
}
