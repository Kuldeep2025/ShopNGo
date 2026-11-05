"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { getClientFirebaseConfig, isFirebaseConfigured } from "@/lib/env";
import type { Analytics } from "firebase/analytics";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured()) return null;

  if (!app) {
    const config = getClientFirebaseConfig();
    if (!config) return null;
    app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
  }
  return app;
}

async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (analytics) return analytics;
  if (analyticsPromise) return analyticsPromise;
  const config = getClientFirebaseConfig();
  if (!config?.measurementId || !isFirebaseConfigured()) return null;

  analyticsPromise = (async () => {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;
    const sdk = await import("firebase/analytics");
    if (!(await sdk.isSupported())) return null;
    analytics = sdk.initializeAnalytics(firebaseApp, {
      config: { send_page_view: false },
    });
    return analytics;
  })();
  try {
    return await analyticsPromise;
  } catch {
    analyticsPromise = null;
    return null;
  }
}

export async function setFirebaseAnalyticsConsent(granted: boolean) {
  if (typeof window === "undefined" || (!granted && !analytics)) return;
  try {
    const instance = await getFirebaseAnalytics();
    if (!instance) return;
    const sdk = await import("firebase/analytics");
    sdk.setConsent({ analytics_storage: granted ? "granted" : "denied" });
    sdk.setAnalyticsCollectionEnabled(instance, granted);
  } catch {
    // Analytics must never break navigation when browser support or network is unavailable.
  }
}

/** Analytics is initialized only in a supported browser and after explicit consent. */
export async function trackPageView(path: string, title: string) {
  if (typeof window === "undefined" || !path) return;
  try {
    const instance = await getFirebaseAnalytics();
    if (!instance) return;
    const sdk = await import("firebase/analytics");
    sdk.setConsent({ analytics_storage: "granted" });
    sdk.setAnalyticsCollectionEnabled(instance, true);
    sdk.logEvent(instance, "page_view", {
      page_path: path,
      page_title: title,
      page_location: window.location.href,
    });
  } catch {
    // Analytics must never break navigation when browser support or network is unavailable.
  }
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export async function signInWithEmail(email: string, password: string) {
  const authInstance = getFirebaseAuth();
  if (!authInstance) throw new Error("Firebase Auth is not configured. Check .env.local");
  return signInWithEmailAndPassword(authInstance, email, password);
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  const authInstance = getFirebaseAuth();
  if (!authInstance) throw new Error("Firebase Auth is not configured. Check .env.local");
  const cred = await createUserWithEmailAndPassword(authInstance, email, password);
  const name = displayName?.trim();
  if (name) {
    try {
      await updateProfile(cred.user, { displayName: name });
      // Refresh the token so the server sees the name on the first request.
      await cred.user.getIdToken(true);
    } catch {
      /* the name is a nicety; the account itself is created */
    }
  }
  return cred;
}

export async function sendResetEmail(email: string) {
  const authInstance = getFirebaseAuth();
  if (!authInstance) throw new Error("Firebase Auth is not configured. Check .env.local");
  return sendPasswordResetEmail(authInstance, email);
}

export async function signInWithGoogle() {
  const authInstance = getFirebaseAuth();
  if (!authInstance) throw new Error("Firebase Auth is not configured. Check .env.local");
  const provider = new GoogleAuthProvider();
  return signInWithPopup(authInstance, provider);
}

export async function logOut() {
  const authInstance = getFirebaseAuth();
  if (!authInstance) return;
  return signOut(authInstance);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  const authInstance = getFirebaseAuth();
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
}

export type { User };
