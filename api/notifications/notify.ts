import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getDeviceToken,
  upsertDeviceToken,
  upsertGuardian,
  removeGuardianRecord,
  getGuardianForWallet,
  setWalletFrozenStatus,
} from '../../src/lib/supabase';
import { validateStellarAddress, verifyApiSecret } from '../../src/lib/validate';
import { sendFCMNotification } from '../../src/lib/fcm';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', PHP: '₱', INR: '₹',
  KRW: '₩', SGD: 'S$', AUD: 'A$', CAD: 'C$', HKD: 'HK$', TWD: 'NT$',
  THB: '฿', MYR: 'RM', IDR: 'Rp', VND: '₫', MXN: 'MX$', BRL: 'R$',
  NGN: '₦', GHS: '₵', KES: 'KSh', ZAR: 'R', AED: 'AED', SAR: 'SAR',
  PKR: '₨', BDT: '৳', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr',
  NZD: 'NZ$', ARS: '$', COP: '$', PEN: 'S/', EGP: 'E£', TRY: '₺',
};

async function getExchangeRate(currency: string): Promise<number> {
  if (currency === 'USD') return 1;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json() as { rates: Record<string, number> };
    return data?.rates?.[currency] ?? 1;
  } catch {
    return 1;
  }
}


/**
 * POST /api/notifications/notify
 * Header: Authorization: Bearer <ORBI_API_SECRET>
 * Body: { recipientAddress, senderUsername, usdcAmount, txHash?, senderAddress? }
 *
 * The optional txHash + senderAddress let the recipient app insert the tx into
 * its local history immediately, without waiting for the Soroban event poll.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body ?? {};

  // ── Device token registration (merged from /api/notifications/register) ──────

  if (action === 'register_device') {
    const { stellarAddress, fcmToken, currency } = req.body;
    if (!validateStellarAddress(stellarAddress)) {
      return res.status(400).json({ error: 'Invalid Stellar address' });
    }
    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ error: 'Invalid FCM token' });
    }
    const { error } = await upsertDeviceToken({
      stellar_address: stellarAddress,
      fcm_token: fcmToken,
      currency: currency ?? 'USD',
      updated_at: new Date().toISOString(),
    });
    if (error) return res.status(500).json({ error: 'Failed to register device' });
    return res.status(200).json({ success: true });
  }

  // ── Unauthenticated guardian actions ────────────────────────────────────────

  if (action === 'register_guardian') {
    const { walletAddress, guardianAddress, ownerUsername } = req.body;
    if (!validateStellarAddress(walletAddress) || !validateStellarAddress(guardianAddress)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    await upsertGuardian(walletAddress, guardianAddress);
    const guardianData = await getDeviceToken(guardianAddress);
    if (guardianData) {
      const displayName = ownerUsername ? `@${ownerUsername}` : 'Someone';
      await sendFCMNotification(
        guardianData.fcm_token,
        'You\'re now a guardian',
        `${displayName} added you as their guardian. You can help unfreeze their wallet if it ever gets locked.`,
        { type: 'guardian_added', wallet_address: walletAddress },
      );
    }
    return res.status(200).json({ success: true });
  }

  if (action === 'remove_guardian') {
    const { walletAddress } = req.body;
    if (!validateStellarAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    await removeGuardianRecord(walletAddress);
    return res.status(200).json({ success: true });
  }

  if (action === 'freeze_notify') {
    const { walletAddress, ownerUsername } = req.body;
    if (!validateStellarAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    await setWalletFrozenStatus(walletAddress, true);
    const guardianAddress = await getGuardianForWallet(walletAddress);
    if (!guardianAddress) return res.status(200).json({ success: true, sent: false, reason: 'no guardian' });
    const guardianData = await getDeviceToken(guardianAddress);
    if (!guardianData) return res.status(200).json({ success: true, sent: false, reason: 'guardian not registered' });
    const displayName = ownerUsername ? `@${ownerUsername}` : 'A wallet you protect';
    await sendFCMNotification(
      guardianData.fcm_token,
      'Wallet Frozen',
      `${displayName} was locked after too many failed attempts. Tap to unfreeze.`,
      { type: 'guardian_freeze', wallet_address: walletAddress },
    );
    return res.status(200).json({ success: true, sent: true });
  }

  if (action === 'clear_freeze') {
    const { walletAddress } = req.body;
    if (!validateStellarAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    await setWalletFrozenStatus(walletAddress, false);
    const ownerData = await getDeviceToken(walletAddress);
    if (ownerData) {
      await sendFCMNotification(
        ownerData.fcm_token,
        'Wallet Unfrozen',
        'Your guardian has unfrozen your wallet. You can now unlock it.',
        { type: 'guardian_unfreeze', wallet_address: walletAddress },
      );
    }
    return res.status(200).json({ success: true });
  }

  // ── Authenticated actions ─────────────────────────────────────────────────

  if (!verifyApiSecret(req.headers.authorization ?? null)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Sender confirmation: POST with action='notify_sender'
  if (action === 'notify_sender') {
    const { senderAddress, usdcAmount: amount, recipientLabel } = req.body ?? {};
    if (!validateStellarAddress(senderAddress)) {
      return res.status(400).json({ error: 'Invalid senderAddress' });
    }
    const senderData = await getDeviceToken(senderAddress);
    if (!senderData) return res.status(200).json({ success: true, sent: false, reason: 'sender not registered' });
    const senderRate = await getExchangeRate(senderData.currency);
    const senderLocalAmount = parseFloat(amount) * senderRate;
    const senderSymbol = CURRENCY_SYMBOLS[senderData.currency] ?? senderData.currency;
    const toLabel = recipientLabel ? ` to ${recipientLabel}` : '';
    await sendFCMNotification(
      senderData.fcm_token,
      'Transaction confirmed!',
      `${senderSymbol}${senderLocalAmount.toFixed(2)} sent${toLabel} successfully.`,
    );
    return res.status(200).json({ success: true, sent: true });
  }

  const { recipientAddress, senderUsername, usdcAmount, txHash, senderAddress } = req.body ?? {};

  if (!validateStellarAddress(recipientAddress)) {
    return res.status(400).json({ error: 'Invalid recipient address' });
  }

  const data = await getDeviceToken(recipientAddress);

  if (!data) {
    return res.status(200).json({ success: true, sent: false, reason: 'recipient not registered' });
  }

  const { fcm_token, currency } = data;
  const rate = await getExchangeRate(currency);
  const localAmount = parseFloat(usdcAmount) * rate;
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const formattedAmount = `${symbol}${localAmount.toFixed(2)}`;
  const sender = senderUsername ? `@${senderUsername.replace('@', '')}` : 'Someone';

  // Build data payload only if we have tx details. The recipient app uses these
  // to persist the receive into local history immediately, bypassing the RPC poll.
  const dataPayload: Record<string, string> | undefined =
    txHash && senderAddress
      ? {
          type: 'receive',
          tx_hash: String(txHash),
          sender: String(senderAddress),
          to: String(recipientAddress),
          amount: String(usdcAmount),
          asset: 'USDC',
          timestamp: String(Math.floor(Date.now() / 1000)),
        }
      : undefined;

  await sendFCMNotification(
    fcm_token,
    'You received money!',
    `${sender} sent you ${formattedAmount}`,
    dataPayload,
  );

  return res.status(200).json({ success: true, sent: true });
}
