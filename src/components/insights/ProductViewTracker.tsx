"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/features/identity/AuthProvider";
import { track } from "@/features/recommendations/track";

/** Invisible. Records a product view with time spent, when the shopper leaves the page. */
export function ProductViewTracker({ listingId }: { listingId: string }) {
  const { loading, getIdToken } = useAuth();
  const tokenRef = useRef<string | null | undefined>(undefined);
  const getRef = useRef(getIdToken);
  getRef.current = getIdToken;

  useEffect(() => {
    if (loading) return;
    const start = Date.now();
    let sent = false;
    // Warm the token while the shopper reads, so a send while leaving needs no waiting.
    const warm = setTimeout(async () => {
      try {
        tokenRef.current = await getRef.current();
      } catch {
        tokenRef.current = null;
      }
    }, 1500);

    const send = () => {
      if (sent) return;
      const dwellMs = Date.now() - start;
      if (dwellMs < 2000) return;
      sent = true;
      void track({ type: "VIEW", productRef: listingId, dwellMs }, getRef.current, { keepalive: true, token: tokenRef.current });
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") send();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);
    return () => {
      clearTimeout(warm);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
      send();
    };
  }, [listingId, loading]);

  return null;
}
