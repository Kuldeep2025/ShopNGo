/**
 * Pure helpers for the product suggestion slots: remembering closed suggestions and the
 * slideshow index maths. Storage is passed in so these can be tested without a browser.
 */

export const DISMISSED_KEY = "shopngo.ads.dismissed";
export const HIDDEN_ALL_KEY = "shopngo.ads.hidden";
export const ADS_EVENT = "shopngo:ads-pref";
export const MAX_REMEMBERED = 200;
export const ROTATE_MS = 5000;

export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function readDismissed(store: KeyValueStore | null | undefined): string[] {
  try {
    if (!store) return [];
    const raw = store.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: string[] = [];
    for (const v of data) if (typeof v === "string" && ID_RE.test(v) && !out.includes(v)) out.push(v);
    return out.slice(-MAX_REMEMBERED);
  } catch {
    return [];
  }
}

/** Remembers one closed product. Returns the new list (newest last, capped). Never throws. */
export function addDismissed(store: KeyValueStore | null | undefined, productId: string): string[] {
  const current = readDismissed(store);
  if (!ID_RE.test(productId)) return current;
  const next = [...current.filter((id) => id !== productId), productId].slice(-MAX_REMEMBERED);
  try {
    store?.setItem(DISMISSED_KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: the suggestion is hidden for this visit only */
  }
  return next;
}

export function isDismissed(store: KeyValueStore | null | undefined, productId: string): boolean {
  return readDismissed(store).includes(productId);
}

export function areAllHidden(store: KeyValueStore | null | undefined): boolean {
  try {
    return store?.getItem(HIDDEN_ALL_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAllHidden(store: KeyValueStore | null | undefined, hidden: boolean): void {
  try {
    if (hidden) store?.setItem(HIDDEN_ALL_KEY, "1");
    else store?.removeItem(HIDDEN_ALL_KEY);
  } catch {
    /* ignore */
  }
}

/** Next slide, wrapping round. */
export function nextIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return (((current + 1) % count) + count) % count;
}

/** Previous slide, wrapping round. */
export function prevIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return (((current - 1) % count) + count) % count;
}

/** Keeps an index inside 0..count-1 (for example after a slide is closed). */
export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(count - 1, Math.max(0, Math.trunc(index)));
}

export function slideLabel(index: number, count: number): string {
  return `Slide ${index + 1} of ${count}`;
}

export function shouldAutoRotate(o: {
  count: number;
  userPaused: boolean;
  hovering: boolean;
  focused: boolean;
  tabHidden: boolean;
  reducedMotion: boolean;
}): boolean {
  return o.count > 1 && !o.userPaused && !o.hovering && !o.focused && !o.tabHidden && !o.reducedMotion;
}
