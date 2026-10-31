"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  setFirebaseAnalyticsConsent,
  trackPageView,
} from "@/lib/auth/firebase-client";

const CONSENT_KEY = "shopngo_analytics_consent_v1";
const OPEN_EVENT = "shopngo:open-analytics-preferences";
const CONSENT_EVENT = "shopngo:analytics-consent";
type Consent = "unknown" | "granted" | "denied";

export function FirebaseAnalytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>("unknown");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (saved === "granted" || saved === "denied") setConsent(saved);
    } catch {
      setConsent("unknown");
    }

    const openPreferences = () => {
      setConsent("unknown");
      void setFirebaseAnalyticsConsent(false);
    };
    const updateConsent = (event: Event) => {
      const value = (event as CustomEvent<Consent>).detail;
      if (value === "granted" || value === "denied") {
        setConsent(value);
        if (value === "denied") void setFirebaseAnalyticsConsent(false);
      }
    };
    window.addEventListener(OPEN_EVENT, openPreferences);
    window.addEventListener(CONSENT_EVENT, updateConsent);
    return () => {
      window.removeEventListener(OPEN_EVENT, openPreferences);
      window.removeEventListener(CONSENT_EVENT, updateConsent);
    };
  }, []);

  useEffect(() => {
    if (consent !== "granted" || !pathname) return;
    void trackPageView(pathname, document.title);
  }, [consent, pathname]);

  return null;
}

export function AnalyticsPreferencesButton() {
  return (
    <button
      type="button"
      className="mt-3 text-xs text-gray-500 underline underline-offset-2 hover:text-teal-700 dark:text-zinc-400 dark:hover:text-teal-300"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      Privacy preferences
    </button>
  );
}

export const analyticsConsentKey = CONSENT_KEY;
export const analyticsConsentEvent = CONSENT_EVENT;
export const analyticsPreferencesEvent = OPEN_EVENT;
