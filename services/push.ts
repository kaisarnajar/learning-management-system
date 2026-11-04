import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import { prisma } from "@/utils/prisma";

/**
 * Push notifications to the mobile app through Firebase Cloud Messaging.
 *
 * Configured by FIREBASE_SERVICE_ACCOUNT_JSON (the service-account JSON,
 * raw or base64-encoded). Without it every send is a silent no-op, so the
 * web app keeps working on installs that never set up Firebase. Sends run
 * after the response (callers wrap them in after()), in batches of 500
 * tokens, and tokens FCM reports as gone are deleted so the table does not
 * accumulate dead devices.
 */

const FCM_BATCH_SIZE = 500;
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

let app: App | null | undefined;

function loadServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch (error) {
    console.error("[push] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (raw or base64):", error);
    return null;
  }
}

function getApp(): App | null {
  if (app !== undefined) return app;
  const account = loadServiceAccount();
  if (!account) {
    app = null;
    return app;
  }
  app = getApps()[0] ?? initializeApp({ credential: cert(account) });
  return app;
}

export function isPushConfigured(): boolean {
  return getApp() !== null;
}

export type PushPayload = {
  title: string;
  body?: string | null;
  /** App path the notification opens, e.g. /profile/notifications. */
  href: string;
};

/**
 * Sends one push to every registered device of the given users. Never
 * throws: delivery problems are logged, dead tokens are pruned.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  const firebase = getApp();
  if (!firebase) return;
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;

  const devices = await prisma.deviceToken.findMany({
    where: { userId: { in: unique } },
    select: { token: true },
  });
  if (devices.length === 0) return;

  const messaging = getMessaging(firebase);
  const dead: string[] = [];
  const base: Omit<MulticastMessage, "tokens"> = {
    notification: { title: payload.title, body: payload.body ?? undefined },
    data: { href: payload.href, title: payload.title },
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default" } } },
  };

  for (let i = 0; i < devices.length; i += FCM_BATCH_SIZE) {
    const tokens = devices.slice(i, i + FCM_BATCH_SIZE).map((d) => d.token);
    try {
      const result = await messaging.sendEachForMulticast({ ...base, tokens });
      result.responses.forEach((response, index) => {
        if (!response.success && response.error && DEAD_TOKEN_CODES.has(response.error.code)) {
          dead.push(tokens[index]);
        }
      });
    } catch (error) {
      console.error("[push] Batch send failed:", error);
    }
  }

  if (dead.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } }).catch((error) => {
      console.error("[push] Could not prune dead tokens:", error);
    });
  }
}
