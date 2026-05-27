const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'apikey': SUPABASE_SERVICE_KEY,
  'Prefer': 'resolution=merge-duplicates,return=minimal',
};

export async function upsertDeviceToken(data: {
  stellar_address: string;
  fcm_token: string;
  currency: string;
  updated_at: string;
}): Promise<{ error: string | null }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/device_tokens`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: text };
  }
  return { error: null };
}

export async function getDeviceToken(stellarAddress: string): Promise<{
  fcm_token: string;
  currency: string;
} | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/device_tokens?stellar_address=eq.${encodeURIComponent(stellarAddress)}&select=fcm_token,currency&limit=1`,
    { headers },
  );
  if (!res.ok) return null;
  const rows = await res.json() as any[];
  return rows[0] ?? null;
}

// ── Username registry ─────────────────────────────────────────────────────────

export async function upsertUsername(username: string, address: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/usernames`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username: username.toLowerCase(), address }),
  });
}

export async function resolveUsernameAddress(username: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/usernames?username=eq.${encodeURIComponent(username.toLowerCase())}&select=address&limit=1`,
    { headers },
  );
  if (!res.ok) return null;
  const rows = await res.json() as { address: string }[];
  return rows[0]?.address ?? null;
}

export async function usernameExists(username: string): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/usernames?username=eq.${encodeURIComponent(username.toLowerCase())}&select=username&limit=1`,
    { headers },
  );
  if (!res.ok) return false;
  const rows = await res.json() as any[];
  return rows.length > 0;
}

export async function getUsernameByAddress(address: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/usernames?address=eq.${encodeURIComponent(address)}&select=username&limit=1`,
    { headers },
  );
  if (!res.ok) return null;
  const rows = await res.json() as { username: string }[];
  return rows[0]?.username ?? null;
}

// ── Guardian registry ─────────────────────────────────────────────────────────

export async function upsertGuardian(walletAddress: string, guardianAddress: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/guardians`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ wallet_address: walletAddress, guardian_address: guardianAddress }),
  });
}

export async function removeGuardianRecord(walletAddress: string): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/rest/v1/guardians?wallet_address=eq.${encodeURIComponent(walletAddress)}`,
    { method: 'DELETE', headers },
  );
}

export async function getGuardianForWallet(walletAddress: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/guardians?wallet_address=eq.${encodeURIComponent(walletAddress)}&select=guardian_address&limit=1`,
    { headers },
  );
  if (!res.ok) return null;
  const rows = await res.json() as { guardian_address: string }[];
  return rows[0]?.guardian_address ?? null;
}

export async function getWalletsGuardedBy(guardianAddress: string): Promise<{ wallet_address: string; is_frozen: boolean }[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/guardians?guardian_address=eq.${encodeURIComponent(guardianAddress)}&select=wallet_address,is_frozen`,
    { headers },
  );
  if (!res.ok) return [];
  return res.json() as Promise<{ wallet_address: string; is_frozen: boolean }[]>;
}

export async function setWalletFrozenStatus(walletAddress: string, isFrozen: boolean): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/rest/v1/guardians?wallet_address=eq.${encodeURIComponent(walletAddress)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        is_frozen: isFrozen,
        frozen_at: isFrozen ? new Date().toISOString() : null,
      }),
    },
  );
}

// ── Bundle queue ──────────────────────────────────────────────────────────────

export interface BundleRow {
  id: string;
  auth_entry_xdr: string;
  contract_id: string;
  function: string;
  args_xdr: string;
  status: string;
  flush_batch_id: string | null;
  tx_hash: string | null;
  error: string | null;
}

export async function insertBundleEntry(data: {
  auth_entry_xdr: string;
  contract_id: string;
  function: string;
  args_xdr: string;
}): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bundle_queue`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`insertBundleEntry failed: ${await res.text()}`);
  const rows = await res.json() as BundleRow[];
  return rows[0].id;
}

export async function claimPendingBundle(batchId: string, limit: number): Promise<BundleRow[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_pending_bundle`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_batch_id: batchId, p_limit: limit }),
  });
  if (!res.ok) throw new Error(`claimPendingBundle failed: ${await res.text()}`);
  return res.json() as Promise<BundleRow[]>;
}

export async function updateBundleEntries(
  batchId: string,
  status: 'done' | 'failed',
  txHash?: string,
  error?: string,
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bundle_queue?flush_batch_id=eq.${batchId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status,
        tx_hash: txHash ?? null,
        error: error ?? null,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!res.ok) throw new Error(`updateBundleEntries failed: ${await res.text()}`);
}

export async function getBundleEntry(id: string): Promise<{
  status: string;
  tx_hash: string | null;
  error: string | null;
} | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bundle_queue?id=eq.${id}&select=status,tx_hash,error&limit=1`,
    { headers },
  );
  if (!res.ok) return null;
  const rows = await res.json() as any[];
  return rows[0] ?? null;
}

