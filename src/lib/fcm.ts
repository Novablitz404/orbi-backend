import { getGoogleAccessToken } from './googleAuth';

const SERVICE_ACCOUNT = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
const PROJECT_ID = SERVICE_ACCOUNT.project_id;

export async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  // FCM data payload — recipient app reads these to insert the tx locally
  // without an extra RPC round-trip. All values must be strings (FCM constraint).
  data?: Record<string, string>,
): Promise<void> {
  const accessToken = await getGoogleAccessToken('https://www.googleapis.com/auth/firebase.messaging');

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body },
          ...(data ? { data } : {}),
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'orbi_v2',
              notification_priority: 'PRIORITY_MAX',
              default_sound: true,
              default_vibrate_timings: true,
            },
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default', badge: 1 } },
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    console.error('[FCM] send failed:', JSON.stringify(err));
  }
}
