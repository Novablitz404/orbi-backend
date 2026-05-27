import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proposeRecovery } from '../../../src/lib/stellar';
import { checkRateLimit, getClientIp } from '../../../src/lib/rateLimit';
import { setCorsHeaders } from '../../../src/lib/validate';

// Tightly rate-limited — recovery is a rare operation
const RECOVERY_MAX = 3;
const RECOVERY_WINDOW_MS = 60 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>);
  if (!checkRateLimit(`recovery:${ip}`, RECOVERY_MAX, RECOVERY_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const {
    walletContractId,
    guardianKey,
    guardianSignature,
    newPasskeyId,
    newPublicKey,
  } = req.body as {
    walletContractId: string;
    guardianKey: string;
    guardianSignature: string;
    newPasskeyId: string;
    newPublicKey: string;
  };

  if (!walletContractId || !guardianKey || !guardianSignature || !newPasskeyId || !newPublicKey) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hash = await proposeRecovery(
      walletContractId,
      guardianKey,
      guardianSignature,
      newPasskeyId,
      newPublicKey,
    );
    return res.status(200).json({ hash });
  } catch (err: any) {
    // P-M1: log full error server-side, return generic message to client
    console.error('[wallet/recovery/propose]', err);
    return res.status(500).json({ error: 'Recovery proposal failed' });
  }
}
