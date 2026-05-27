const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4/messages';

export async function sendSms(params: {
  to: string;
  message: string;
  senderName?: string;
}): Promise<void> {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey) throw new Error('SEMAPHORE_API_KEY env var not set');

  const body = new URLSearchParams({
    apikey: apiKey,
    number: params.to,
    message: params.message,
    sendername: params.senderName ?? 'ORBI',
  });

  const res = await fetch(SEMAPHORE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Semaphore SMS failed (${res.status}): ${text}`);
  }
}
