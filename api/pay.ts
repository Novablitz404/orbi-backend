import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveUsernameAddress } from '../src/lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.to;
  const username = (Array.isArray(raw) ? raw[0] : raw ?? '').replace(/^@/, '').trim().toLowerCase();

  if (!username) {
    return res.status(400).send('Missing ?to= parameter');
  }

  const address = await resolveUsernameAddress(username);

  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.orbiwallet';
  // Intent URL: Chrome intercepts this on Android — opens the app if installed,
  // falls back to Play Store via S.browser_fallback_url if not installed.
  // More reliable than orbiwallet:// custom scheme which modern Chrome may block.
  const intentUrl = `intent://send?recipientName=${encodeURIComponent(username)}#Intent;scheme=orbiwallet;package=com.orbiwallet;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;
  const displayAddress = address ?? null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Send to @${username} — Orbi Wallet</title>
  <meta property="og:title" content="Send to @${username} on Orbi" />
  <meta property="og:description" content="Tap to open Orbi Wallet and send USDC to @${username} instantly." />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d0d0f;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1a1a1f;
      border: 1px solid #2a2a33;
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .logo { font-size: 40px; margin-bottom: 8px; }
    .app-name { color: #666; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 28px; }
    .avatar {
      width: 64px; height: 64px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; font-weight: 700;
      margin: 0 auto 12px;
      color: #fff;
    }
    .username { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .at { color: #8b5cf6; }
    .address {
      color: #444;
      font-size: 11px;
      font-family: monospace;
      word-break: break-all;
      margin-bottom: 32px;
      padding: 0 8px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      border-radius: 99px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      margin-bottom: 12px;
    }
    .btn-primary { background: #8b5cf6; color: #fff; }
    .btn-secondary {
      background: transparent;
      border: 1px solid #2a2a33;
      color: #888;
      font-size: 14px;
    }
    .divider { color: #333; font-size: 12px; margin: 4px 0 16px; }
    .footer { color: #333; font-size: 11px; margin-top: 24px; }
  </style>
  <script>
    window.onload = function() {
      var ua = navigator.userAgent.toLowerCase();
      var isAndroid = /android/.test(ua);
      var isIOS = /iphone|ipad/.test(ua);
      var intentUrl = '${intentUrl}';
      var playStoreUrl = '${playStoreUrl}';

      document.getElementById('openBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if (isAndroid) {
          window.location.href = intentUrl;
        } else if (isIOS) {
          window.location.href = 'orbiwallet://send?recipientName=${encodeURIComponent(username)}';
          setTimeout(function() { window.location.href = 'https://apps.apple.com/app/orbi-wallet'; }, 1500);
        } else {
          window.location.href = playStoreUrl;
        }
      });

      // Auto-attempt on mobile load
      if (isAndroid) {
        setTimeout(function() { window.location.href = intentUrl; }, 400);
      } else if (isIOS) {
        setTimeout(function() {
          window.location.href = 'orbiwallet://send?recipientName=${encodeURIComponent(username)}';
          setTimeout(function() { window.location.href = 'https://apps.apple.com/app/orbi-wallet'; }, 1500);
        }, 400);
      }
    };
  </script>
</head>
<body>
  <div class="card">
    <div class="logo">⚡</div>
    <div class="app-name">Orbi Wallet</div>
    <div class="avatar">${username[0].toUpperCase()}</div>
    <div class="username"><span class="at">@</span>${username}</div>
    ${displayAddress
      ? `<div class="address">${displayAddress}</div>`
      : '<div class="address" style="color:#555">User not found</div>'}
    <a id="openBtn" href="#" class="btn btn-primary">Open in Orbi Wallet</a>
    <div class="divider">Don't have the app?</div>
    <a href="${playStoreUrl}" class="btn btn-secondary">Download on Google Play</a>
    <div class="footer">Orbi Wallet — USDC payments on Stellar</div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).send(html);
}
