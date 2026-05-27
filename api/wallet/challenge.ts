import type { VercelRequest, VercelResponse } from '@vercel/node';
import { issueDeployToken } from '../../src/lib/deployToken';
import { setCorsHeaders } from '../../src/lib/validate';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end();

  const passkeyId = req.query.passkeyId as string;
  if (!passkeyId || typeof passkeyId !== 'string') {
    return res.status(400).json({ error: 'passkeyId is required' });
  }

  try {
    const { token, expiresAt } = issueDeployToken(passkeyId);
    return res.status(200).json({ token, expiresAt });
  } catch (err: any) {
    console.error('[wallet/challenge]', err);
    return res.status(500).json({ error: 'Challenge generation failed' });
  }
}
