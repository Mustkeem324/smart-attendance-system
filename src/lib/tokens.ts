import crypto from 'crypto';

const TOKEN_SECRET =
  process.env.JWT_SECRET || 'smart-attendance-super-secure-jwt-secret-key-32-chars-min-2026';

export type ActionTokenPurpose = 'password_reset' | 'account_verify';

export interface SignedActionPayload {
  userId: string;
  email: string;
  purpose: ActionTokenPurpose;
  fingerprint: string;
  exp: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function createUserFingerprint(passwordHash: string): string {
  return crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(passwordHash)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Generates an HMAC-SHA256 signed one-time action token bound to the user's current credential state.
 */
export function generateActionToken(
  user: { id: string; email: string; passwordHash: string },
  purpose: ActionTokenPurpose,
  ttlMinutes: number = 30
): string {
  const payload: SignedActionPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    purpose,
    fingerprint: createUserFingerprint(user.passwordHash),
    exp: Math.floor(Date.now() / 1000) + ttlMinutes * 60,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${purpose}.${encodedPayload}`)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyActionToken(
  token: string,
  expectedPurpose: ActionTokenPurpose
): SignedActionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, providedSig] = parts;

    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${expectedPurpose}.${encodedPayload}`)
      .digest('base64url');

    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SignedActionPayload;
    if (
      !payload ||
      payload.purpose !== expectedPurpose ||
      typeof payload.exp !== 'number' ||
      Math.floor(Date.now() / 1000) > payload.exp
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
