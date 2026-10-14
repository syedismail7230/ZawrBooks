import { UserRole } from '@/types';

export interface SessionUser {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string;
  exp: number; // Expiration timestamp in ms
}

const SESSION_COOKIE_NAME = 'zawr_session';
const SESSION_SECRET = process.env.AUTH_SECRET || 'zawr-books-production-session-secret-salt-2026';

function base64UrlEncode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
  return btoa(str)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  return atob(base64);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Creates a signed JWT-like session token
 */
export async function createSessionToken(
  user: Omit<SessionUser, 'exp'>,
  expiresInSeconds: number = 7 * 24 * 60 * 60 // 7 days
): Promise<string> {
  const payload: SessionUser = {
    ...user,
    exp: Date.now() + expiresInSeconds * 1000,
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const key = await getHmacKey(SESSION_SECRET);
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadEncoded));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureEncoded = base64UrlEncode(String.fromCharCode(...signatureArray));

  return `${payloadEncoded}.${signatureEncoded}`;
}

/**
 * Cryptographically verifies and extracts session token
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadEncoded, signatureEncoded] = parts;
    const key = await getHmacKey(SESSION_SECRET);
    const enc = new TextEncoder();

    const expectedSigRaw = base64UrlDecode(signatureEncoded);
    const expectedSigBytes = new Uint8Array(
      expectedSigRaw.split('').map((c) => c.charCodeAt(0))
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      expectedSigBytes,
      enc.encode(payloadEncoded)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(payloadEncoded);
    const payload: SessionUser = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
