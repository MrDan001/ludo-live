import webpush from "web-push";
import { pool } from "../app/api/auth/_db";

export type PushPayload = { title: string; body: string; url?: string; tag?: string; icon?: string; badge?: string; renotify?: boolean };

function configured() {
  return Boolean(process.env.VAPID_SUBJECT && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configured()) return { sent: 0, skipped: true };
  webpush.setVapidDetails(String(process.env.VAPID_SUBJECT), String(process.env.VAPID_PUBLIC_KEY), String(process.env.VAPID_PRIVATE_KEY));
  const result = await pool.query("SELECT id,endpoint,p256dh,auth FROM ludo_push_subscriptions WHERE user_id=$1", [userId]);
  let sent = 0;
  for (const row of result.rows) {
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 86400, urgency: "normal" });
      sent += 1;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) await pool.query("DELETE FROM ludo_push_subscriptions WHERE id=$1", [row.id]);
      else console.error("Push delivery failed", error);
    }
  }
  return { sent, skipped: false };
}
