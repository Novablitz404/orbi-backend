import { createHmac } from 'crypto';

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSecret(): string {
  const secret = process.env.DEPLOY_SECRET;
  if (!secret) throw new Error('DEPLOY_SECRET not configured');
  return secret;
}

/**
 * Issue a signed deploy token tied to a specific passkeyId.
 * Format: "<expiresAt>.<hmac>"
 * The HMAC covers both the passkeyId and expiry, so tokens cannot be
 * reused for a different passkeyId or forged without the secret.
 */
export function issueDeployToken(passkeyId: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${passkeyId}:${expiresAt}`;
  const mac = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return { token: `${expiresAt}.${mac}`, expiresAt };
}

/**
 * Verify a deploy token. Returns true only if:
 * 1. HMAC is valid (issued by our server)
 * 2. Not expired
 * 3. Bound to this exact passkeyId
 */
export function verifyDeployToken(token: string, passkeyId: string): boolean {
  try {
    const dotIdx = token.indexOf('.');
    if (dotIdx === -1) return false;
    const expiresAt = parseInt(token.slice(0, dotIdx), 10);
    const mac = token.slice(dotIdx + 1);
    if (Date.now() > expiresAt) return false;
    const payload = `${passkeyId}:${expiresAt}`;
    const expected = createHmac('sha256', getSecret()).update(payload).digest('hex');
    // Constant-time comparison to prevent timing attacks
    if (mac.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
