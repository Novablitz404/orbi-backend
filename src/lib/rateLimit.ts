const store = new Map<string, { count: number; windowStart: number }>();

/**
 * Sliding window rate limiter. Returns true if the request should be allowed.
 * Not persistent across serverless cold starts — provides a meaningful barrier
 * but not a hard guarantee. Pair with Vercel's edge rate limiting for production.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count += 1;
  return true;
}

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return 'unknown';
}
