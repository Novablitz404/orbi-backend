import type { VercelRequest, VercelResponse } from '@vercel/node';
import { submitFeeBump } from '../../src/lib/stellar';
import { checkRateLimit, getClientIp } from '../../src/lib/rateLimit';
import { setCorsHeaders } from '../../src/lib/validate';

// P-L1: rate limit fee-bump relay — max 20 submits per IP per 10 minutes
const SUBMIT_MAX = 20;
const SUBMIT_WINDOW_MS = 10 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>);
  if (!checkRateLimit(`submit:${ip}`, SUBMIT_MAX, SUBMIT_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { xdr } = req.body as { xdr: string };

  if (!xdr || typeof xdr !== 'string') {
    return res.status(400).json({ error: 'xdr is required' });
  }

  try {
    const hash = await submitFeeBump(xdr);
    return res.status(200).json({ hash });
  } catch (err: any) {
    // P-M1: log full error server-side, return generic message to client
    console.error('[wallet/submit]', err);
    return res.status(500).json({ error: 'Transaction submission failed' });
  }
}
