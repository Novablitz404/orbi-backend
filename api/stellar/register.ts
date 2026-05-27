import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateUsername, validateStellarAddress } from '../../src/lib/validate';
import { resolveUsernameAddress, usernameExists, getUsernameByAddress, getWalletsGuardedBy } from '../../src/lib/supabase';

function sanitizeUsername(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/^@/, '');
  if (!clean || !/^[a-z0-9_-]+$/.test(clean) || clean.length > 20) return null;
  return clean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // ?guarded_by=G... — list wallets this address is guarding
  if (req.query.guarded_by) {
    const address = req.query.guarded_by as string;
    if (!validateStellarAddress(address)) return res.status(400).json({ error: 'Invalid address' });
    const wallets = await getWalletsGuardedBy(address);
    return res.status(200).json({ wallets });
  }

  // ?address=C... — reverse lookup: address → username
  if (req.query.address) {
    const address = req.query.address as string;
    const username = await getUsernameByAddress(address);
    if (!username) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ username });
  }

  // ?check=alice — availability check before wallet creation
  if (req.query.check) {
    const raw = req.query.check as string;
    const clean = sanitizeUsername(raw);
    if (!clean) return res.status(400).json({ error: 'Invalid username' });
    // Full format validation only at registration — here we just need clean chars
    const { valid, error } = validateUsername(clean);
    if (!valid) return res.status(200).json({ username: clean, available: false, error });
    try {
      const taken = await usernameExists(clean);
      return res.status(200).json({ username: clean, available: !taken });
    } catch {
      return res.status(500).json({ error: 'Check failed' });
    }
  }

  // ?username=alice — resolve username → wallet C address
  const raw = req.query.username as string;
  const clean = sanitizeUsername(raw);
  if (!clean) return res.status(400).json({ error: 'Invalid username' });
  try {
    const address = await resolveUsernameAddress(clean);
    if (!address) return res.status(404).json({ error: 'Username not found' });
    return res.status(200).json({ username: clean, address });
  } catch (err: any) {
    console.error('[stellar/register GET]', err);
    return res.status(500).json({ error: 'Resolution failed' });
  }
}
