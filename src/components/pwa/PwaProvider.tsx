"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Registers the service worker and shows a small "Install app" pill
 * when the browser fires beforeinstallprompt. Additive only.
 */
export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* service worker is optional – ignore failures */
      });
    }
    try {
      setDismissed(localStorage.getItem("shopngo_pwa_dismissed") === "1");
    } catch {
      /* ignore */
    }
    function onPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // Hide on auth screen so it never blocks sign-in
  if (pathname?.startsWith("/auth") || dismissed || !installEvent) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  function dismiss() {
    try {
      localStorage.setItem("shopngo_pwa_dismissed", "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-teal-200/60 bg-white/95 p-3 shadow-2xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Install ShopNGo</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">Shop faster from your home screen</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={install}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-500"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1.5 text-gray-400 transition hover:text-gray-700 dark:hover:text-zinc-200"
          aria-label="Dismiss install prompt"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}