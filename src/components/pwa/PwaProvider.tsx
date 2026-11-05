"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Registers the service worker, announces offline/online changes, and offers
 * an "Install app" button when the browser allows installing.
 */
export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [online, setOnline] = useState(true);
  const [announce, setAnnounce] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* the app works without the service worker */
      });
    }
    try {
      setDismissed(localStorage.getItem("shopngo_pwa_dismissed") === "1");
    } catch {
      /* ignore */
    }
    setOnline(navigator.onLine);

    function onPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstallEvent(null);
      setAnnounce("ShopNGo was installed on your device.");
    }
    function onOffline() {
      setOnline(false);
      setAnnounce("You are offline. Some features may not work.");
    }
    function onOnline() {
      setOnline(true);
      setAnnounce("You are back online.");
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

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

  const showInstall = !!installEvent && !dismissed && !pathname?.startsWith("/auth");

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-[60] bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">
          You are offline. Saved pages still work, but orders and cart need internet.
        </div>
      )}
      {showInstall && (
        <div
          role="region"
          aria-label="Install ShopNGo"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-teal-200/60 bg-white/95 p-3 shadow-2xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95"
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Install ShopNGo</p>
              <p className="text-xs text-gray-600 dark:text-zinc-400">Open it from your home screen like an app</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
