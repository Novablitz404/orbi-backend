import type { VercelResponse } from '@vercel/node';

// P-L2: explicit CORS policy — mobile-only API, no browser cross-origin access
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', 'null');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret');
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  const clean = username.trim().toLowerCase();
  if (clean.length < 5 || clean.length > 20) {
    return { valid: false, error: 'Username must be 5–20 characters' };
  }
  if (!/^[a-z0-9_-]+$/.test(clean)) {
    return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
  }
  if (/^[-_]|[-_]$/.test(clean)) {
    return { valid: false, error: 'Username cannot start or end with a hyphen or underscore' };
  }
  if (/--|__/.test(clean)) {
    return { valid: false, error: 'Username cannot contain consecutive hyphens or underscores' };
  }
  return { valid: true };
}

export function validateStellarAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  const a = address.trim();
  // G addresses (classic accounts) and C addresses (smart wallet contracts) are both valid
  return /^G[A-Z2-7]{55}$/.test(a) || /^C[A-Z2-7]{55}$/.test(a);
}

export function verifyApiSecret(authHeader: string | null): boolean {
  const secret = process.env.ORBI_API_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}
