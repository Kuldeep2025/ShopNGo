/**
 * Browser-side interaction tracker. Everything here fails silently: tracking must never break a page.
 * Signed-in shoppers send their Bearer token; guests send an anonymous id kept in localStorage.
 */

export type TrackEvent =
  | { type: "VIEW"; productRef: string; dwellMs?: number }
  | { type: "CART" | "LIKE" | "DISMISS"; productRef: string }
  | { type: "SEARCH"; query: string };

type TokenGetter = (() => Promise<string | null>) | undefined;

const ANON_KEY = "shopngo.anon";

export function getAnonId(): string | null {
  try {
    if (typeof window === "undefined") return null;
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      const rnd =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().replace(/-/g, "")
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      id = `g${rnd}`.slice(0, 40);
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

async function headers(getIdToken: TokenGetter, json: boolean, token?: string | null): Promise<Record<string, string>> {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const anon = getAnonId();
  if (anon) h["x-anon-id"] = anon;
  let t = token;
  if (t === undefined && getIdToken) {
    try {
      t = await getIdToken();
    } catch {
      t = null;
    }
  }
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/** Sends one interaction. Resolves true on success, false on any problem; never throws. */
export async function track(event: TrackEvent, getIdToken?: TokenGetter, opts: { keepalive?: boolean; token?: string | null } = {}): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: await headers(getIdToken, true, opts.token),
      body: JSON.stringify({ ...event, anonId: getAnonId() ?? undefined }),
      keepalive: opts.keepalive ?? false,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Takes back one save or dismissal. */
export async function untrack(productRef: string, type: "LIKE" | "DISMISS", getIdToken?: TokenGetter): Promise<boolean> {
  try {
    const res = await fetch(`/api/interactions?product=${encodeURIComponent(productRef)}&type=${type}`, {
      method: "DELETE",
      headers: await headers(getIdToken, false),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** "Reset my recommendations": forgets everything learned about this shopper. */
export async function resetInteractions(getIdToken?: TokenGetter): Promise<boolean> {
  try {
    const res = await fetch("/api/interactions", { method: "DELETE", headers: await headers(getIdToken, false) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Headers for reading recommendations as the current shopper. */
export async function recHeaders(getIdToken?: TokenGetter): Promise<Record<string, string>> {
  return headers(getIdToken, false);
}
