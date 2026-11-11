import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import { deletePushSubscription, getPushSubscriptions } from "./db/repo";

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

/** Sends a notification to every installed phone. Expired subscriptions are removed. */
export async function notifyAll(title: string, body: string, url = "/") {
  if (!configure()) {
    console.warn("push not configured (VAPID keys missing):", title);
    return 0;
  }
  const subs = await getPushSubscriptions();
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await sendNotification(sub, JSON.stringify({ title, body, url }), { TTL: 6 * 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await deletePushSubscription(sub.endpoint);
        else console.error("push failed", code, e);
      }
    }),
  );
  return sent;
}
