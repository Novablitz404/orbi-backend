import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deploySmartWallet } from '../../src/lib/stellar';
import { verifyDeployToken } from '../../src/lib/deployToken';
import { validateUsername, setCorsHeaders } from '../../src/lib/validate';
import { upsertUsername, usernameExists } from '../../src/lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { passkeyId, publicKey, deployToken, username } = req.body as {
    passkeyId: string;
    publicKey: string;
    deployToken: string;
    username: string;
  };

  if (!passkeyId || typeof passkeyId !== 'string') {
    return res.status(400).json({ error: 'passkeyId and publicKey are required' });
  }
  if (!publicKey || typeof publicKey !== 'string') {
    return res.status(400).json({ error: 'passkeyId and publicKey are required' });
  }

  // Validate username format
  const { valid, error: usernameError } = validateUsername(username);
  if (!valid) {
    return res.status(400).json({ error: usernameError ?? 'Invalid username' });
  }
  const cleanUsername = username.trim().toLowerCase();

  // Verify challenge token
  if (!deployToken || !verifyDeployToken(deployToken, passkeyId)) {
    return res.status(401).json({ error: 'Invalid or expired deploy token' });
  }

  // Check username availability before deploying — fail fast before spending XLM
  try {
    const taken = await usernameExists(cleanUsername);
    if (taken) {
      return res.status(409).json({ error: 'Username already taken' });
    }
  } catch {
    return res.status(500).json({ error: 'Wallet deployment failed' });
  }

  try {
    const contractAddress = await deploySmartWallet(passkeyId, publicKey);
    await upsertUsername(cleanUsername, contractAddress);
    return res.status(200).json({ contractAddress, username: cleanUsername });
  } catch (err: any) {
    console.error('[wallet/deploy]', err);
    if (err.message?.includes('UsernameTaken')) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    return res.status(500).json({ error: 'Wallet deployment failed' });
  }
}
