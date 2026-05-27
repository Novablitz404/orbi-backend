import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getTierLimits,
  setWalletDailyLimit,
  setFactoryTierLimits,
  operatorFreezeWallet,
  operatorUnfreezeWallet,
} from '../../src/lib/stellar';
import { setCorsHeaders } from '../../src/lib/validate';

const TIERS = ['unverified', 'verified'] as const;
type Tier = typeof TIERS[number];

function verifyAdmin(req: VercelRequest): boolean {
  const adminSecret = req.headers['x-admin-secret'];
  const requiredSecret = process.env.ADMIN_SECRET;
  return !(!requiredSecret || adminSecret !== requiredSecret);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // GET — read current tier limits from factory
  if (req.method === 'GET') {
    try {
      const { unverified, verified } = await getTierLimits();
      return res.status(200).json({
        unverified: { stroops: unverified, usdc: unverified / 10_000_000 },
        verified:   { stroops: verified,   usdc: verified   / 10_000_000 },
      });
    } catch (err: any) {
      console.error('[wallet/tier GET]', err);
      return res.status(500).json({ error: 'Failed to read tier limits' });
    }
  }

  // PATCH — update factory-level tier limits (changes defaults for all future wallets)
  // Body: { unverifiedUsdc: number, verifiedUsdc: number }
  if (req.method === 'PATCH') {
    if (!verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { unverifiedUsdc, verifiedUsdc } = req.body as {
      unverifiedUsdc: number;
      verifiedUsdc: number;
    };

    if (typeof unverifiedUsdc !== 'number' || unverifiedUsdc <= 0) {
      return res.status(400).json({ error: 'unverifiedUsdc must be a positive number' });
    }
    if (typeof verifiedUsdc !== 'number' || verifiedUsdc <= unverifiedUsdc) {
      return res.status(400).json({ error: 'verifiedUsdc must be greater than unverifiedUsdc' });
    }

    try {
      const unverifiedStroops = Math.round(unverifiedUsdc * 10_000_000);
      const verifiedStroops   = Math.round(verifiedUsdc   * 10_000_000);
      const hash = await setFactoryTierLimits(unverifiedStroops, verifiedStroops);
      return res.status(200).json({
        hash,
        unverified: { usdc: unverifiedUsdc, stroops: unverifiedStroops },
        verified:   { usdc: verifiedUsdc,   stroops: verifiedStroops },
      });
    } catch (err: any) {
      console.error('[wallet/tier PATCH]', err);
      return res.status(500).json({ error: 'Failed to update tier limits' });
    }
  }

  // POST — wallet tier and freeze actions (all require admin)
  if (req.method === 'POST') {
    if (!verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { walletContractId, action, tier, reason } = req.body as {
      walletContractId: string;
      action?: 'set_tier' | 'freeze' | 'unfreeze';
      tier?: Tier;
      reason?: string;
    };

    if (!walletContractId) {
      return res.status(400).json({ error: 'walletContractId is required' });
    }

    const op = action ?? 'set_tier';

    // ── Set wallet tier (KYC upgrade/downgrade) ──────────────────────────────
    if (op === 'set_tier') {
      if (!tier || !TIERS.includes(tier)) {
        return res.status(400).json({ error: 'tier must be unverified or verified' });
      }
      try {
        const limits = await getTierLimits();
        const limitStroops = tier === 'verified' ? limits.verified : limits.unverified;
        const hash = await setWalletDailyLimit(walletContractId, limitStroops);
        return res.status(200).json({
          hash, tier,
          limitStroops,
          limitUsdc: limitStroops / 10_000_000,
        });
      } catch (err: any) {
        console.error('[wallet/tier set_tier]', err);
        return res.status(500).json({ error: 'Failed to update wallet tier' });
      }
    }

    // ── Operator compliance freeze ────────────────────────────────────────────
    if (op === 'freeze') {
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ error: 'reason is required for freeze (e.g. case reference)' });
      }
      try {
        const hash = await operatorFreezeWallet(walletContractId, reason.trim());
        return res.status(200).json({ hash, frozen: true, reason: reason.trim() });
      } catch (err: any) {
        console.error('[wallet/tier freeze]', err);
        return res.status(500).json({ error: 'Failed to freeze wallet' });
      }
    }

    // ── Operator compliance unfreeze ──────────────────────────────────────────
    if (op === 'unfreeze') {
      try {
        const hash = await operatorUnfreezeWallet(walletContractId);
        return res.status(200).json({ hash, frozen: false });
      } catch (err: any) {
        console.error('[wallet/tier unfreeze]', err);
        return res.status(500).json({ error: 'Failed to unfreeze wallet' });
      }
    }

    return res.status(400).json({ error: 'action must be set_tier, freeze, or unfreeze' });
  }

  return res.status(405).end();
}
