import { getServerEnv } from "@/lib/env";

/**
 * Firebase Admin SDK helper (server-only).
 * Used to verify ID tokens and manage users on the server.
 * Returns null when credentials are missing or still placeholders.
 */
export async function getFirebaseAdminApp() {
  if (typeof window !== "undefined") {
    throw new Error("firebase-admin must only be imported on the server");
  }

  const env = getServerEnv();

  if (
    !env.FIREBASE_ADMIN_PROJECT_ID ||
    !env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    !env.FIREBASE_ADMIN_PRIVATE_KEY ||
    env.FIREBASE_ADMIN_PROJECT_ID.includes("REPLACE_ME")
  ) {
    return null;
  }

  try {
    const admin = await import("firebase-admin");

    if (admin.apps.length > 0) {
      return admin.app();
    }

    const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function verifyIdToken(idToken: string) {
  const app = await getFirebaseAdminApp();
  if (!app) return null;

  try {
    const admin = await import("firebase-admin");
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded;
  } catch {
    return null;
  }
}
