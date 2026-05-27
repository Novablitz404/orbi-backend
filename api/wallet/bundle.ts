import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enqueue, flush, getStatus } from '../../src/lib/bundler';
import { checkRateLimit, getClientIp } from '../../src/lib/rateLimit';
import { setCorsHeaders } from '../../src/lib/validate';

const BUNDLE_MAX = 30;
const BUNDLE_WINDOW_MS = 10 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // GET /api/wallet/bundle?id=<requestId> — poll for result
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id query param is required' });
    }
    try {
      const entry = await getStatus(id);
      if (!entry) return res.status(404).json({ error: 'Not found' });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        status: entry.status,
        ...(entry.tx_hash  ? { txHash: entry.tx_hash }  : {}),
        ...(entry.error    ? { error:  entry.error }     : {}),
      });
    } catch (err) {
      console.error('[wallet/bundle GET]', err);
      return res.status(500).json({ error: 'Failed to get bundle status' });
    }
  }

  // POST /api/wallet/bundle — enqueue a signed auth entry
  if (req.method === 'POST') {
    const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>);
    if (!checkRateLimit(`bundle:${ip}`, BUNDLE_MAX, BUNDLE_WINDOW_MS)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const { authEntryXdr, call } = req.body as {
      authEntryXdr: string;
      call: { contractId: string; function: string; argsXdr: string[] };
    };

    if (!authEntryXdr || typeof authEntryXdr !== 'string') {
      return res.status(400).json({ error: 'authEntryXdr is required' });
    }
    if (
      !call?.contractId || typeof call.contractId !== 'string' ||
      !call?.function   || typeof call.function   !== 'string' ||
      !Array.isArray(call?.argsXdr)
    ) {
      return res.status(400).json({ error: 'call.contractId, call.function, and call.argsXdr are required' });
    }

    try {
      const requestId = await enqueue(authEntryXdr, call);
      await flush();
      const entry = await getStatus(requestId);
      if (entry?.status === 'done') {
        return res.status(200).json({ txHash: entry.tx_hash });
      }
      return res.status(500).json({ error: entry?.error ?? 'Bundle execution failed' });
    } catch (err) {
      console.error('[wallet/bundle POST]', err);
      return res.status(500).json({ error: 'Failed to queue transaction' });
    }
  }

  return res.status(405).end();
}
