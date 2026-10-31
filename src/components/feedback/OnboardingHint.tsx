"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  analyticsConsentEvent,
  analyticsConsentKey,
  analyticsPreferencesEvent,
} from "@/components/analytics/FirebaseAnalytics";

const ONBOARDING_KEY = "shopngo_onboarded_v1";
type Consent = "granted" | "denied";

export function OnboardingHint() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setShowWelcome(true);
      const consent = localStorage.getItem(analyticsConsentKey);
      if (consent !== "granted" && consent !== "denied") setShowPreferences(true);
    } catch {
      setShowWelcome(true);
      setShowPreferences(true);
    }

    const openPreferences = () => setShowPreferences(true);
    window.addEventListener(analyticsPreferencesEvent, openPreferences);
    return () => window.removeEventListener(analyticsPreferencesEvent, openPreferences);
  }, []);

  function dismissWelcome() {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      /* Continue without persistent onboarding state when storage is unavailable. */
    }
    setShowWelcome(false);
  }

  function chooseAnalytics(value: Consent) {
    try {
      localStorage.setItem(analyticsConsentKey, value);
    } catch {
      /* The choice still applies for this page when browser storage is unavailable. */
    }
    window.dispatchEvent(new CustomEvent(analyticsConsentEvent, { detail: value }));
    setShowPreferences(false);
  }

  if (!showWelcome && !showPreferences) return null;

  return (
    <aside
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-teal-200 bg-white p-4 shadow-xl dark:border-teal-800 dark:bg-zinc-900 sm:left-auto sm:right-6"
      role="region"
      aria-label={showWelcome ? "Welcome to ShopNGo" : "Privacy preferences"}
    >
      {showWelcome && (
        <>
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            Welcome to ShopNGo
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
            Search products, open a category, or sign in to save your cart and
            orders. Verified sellers only go live after review.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/search" onClick={dismissWelcome}>
              <Button size="sm">Start searching</Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={dismissWelcome}>
              Got it
            </Button>
          </div>
        </>
      )}
      {showPreferences && (
        <div className={showWelcome ? "mt-3 border-t border-gray-200 pt-3 dark:border-zinc-700" : ""}>
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            Analytics preferences
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            Allow ShopNGo to send page-view usage events to Google Analytics? You can decline and still use the shop.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => chooseAnalytics("granted")}>
              Allow analytics
            </Button>
            <Button size="sm" variant="outline" onClick={() => chooseAnalytics("denied")}>
              No thanks
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
