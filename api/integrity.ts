import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';
import { getGoogleAccessToken } from '../src/lib/googleAuth';

const PACKAGE_NAME = 'com.orbiwallet';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  // GET ?action=nonce → issue a fresh challenge nonce
  if (action === 'nonce') {
    if (req.method !== 'GET') return res.status(405).end();
    const nonce = randomBytes(32).toString('base64url');
    return res.json({ nonce });
  }

  // POST ?action=verify → verify Play Integrity / App Attest token
  if (action === 'verify') {
    if (req.method !== 'POST') return res.status(405).end();

    const { token, platform } = req.body as { token: string; platform: string };
    if (!token) return res.status(400).json({ error: 'missing token' });

    if (platform === 'android') {
      try {
        const accessToken = await getGoogleAccessToken('https://www.googleapis.com/auth/playintegrity');
        const response = await fetch(
          `https://playintegrity.googleapis.com/v1/${PACKAGE_NAME}:decodeIntegrityToken`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ integrity_token: token }),
          },
        );
        const data = await response.json() as any;
        const verdict = data.tokenPayloadExternal;
        const deviceVerdicts: string[] = verdict?.deviceIntegrity?.deviceRecognitionVerdict ?? [];
        const passed =
          deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY') ||
          deviceVerdicts.includes('MEETS_BASIC_INTEGRITY');
        return res.json({ passed });
      } catch (err) {
        console.error('[Integrity] verify failed:', err);
        return res.status(500).json({ passed: false });
      }
    }

    // iOS — App Attest verification can be added later
    return res.json({ passed: true });
  }

  return res.status(400).json({ error: 'action must be nonce or verify' });
}
