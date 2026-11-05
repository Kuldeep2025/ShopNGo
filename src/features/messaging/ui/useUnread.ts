"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/identity/AuthProvider";
import { apiCall } from "@/lib/client/api";

/** Unread message counts for the header badge. Polls every 20 seconds while signed in. */
export function useUnreadMessages(): { customer: number; seller: number } {
  const { appUser, getIdToken } = useAuth();
  const [counts, setCounts] = useState({ customer: 0, seller: 0 });
  const signedIn = Boolean(appUser);

  useEffect(() => {
    if (!signedIn) {
      setCounts({ customer: 0, seller: 0 });
      return;
    }
    let alive = true;
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const res = await apiCall<{ customer: number; seller: number }>(getIdToken, "/api/conversations/unread");
      if (alive && res.ok) setCounts({ customer: res.data.customer ?? 0, seller: res.data.seller ?? 0 });
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [signedIn, getIdToken]);

  return counts;
}

export const unreadLabel = (label: string, n: number) => (n > 0 ? `${label}, ${n} unread` : label);
