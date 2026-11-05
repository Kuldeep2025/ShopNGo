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

  const projectId =
    env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const hasServiceAccount = Boolean(
    env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      env.FIREBASE_ADMIN_PRIVATE_KEY &&
      !env.FIREBASE_ADMIN_CLIENT_EMAIL.includes("REPLACE_ME"),
  );

  if (!projectId || projectId.includes("REPLACE_ME")) {
    return null;
  }

  try {
    const admin = await import("firebase-admin");

    if (admin.apps.length > 0) {
      return admin.app();
    }

    if (!hasServiceAccount) {
      // Project-ID-only mode: enough to verify Firebase ID tokens (public certs).
      return admin.initializeApp({ projectId });
    }

    const privateKey = (env.FIREBASE_ADMIN_PRIVATE_KEY as string).replace(/\\n/g, "\n");

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL as string,
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
