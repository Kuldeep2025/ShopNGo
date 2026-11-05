"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { getListingImageAlt, getListingImageUrl } from "@/features/catalogue/media";
import { recHeaders, track } from "@/features/recommendations/track";
import {
  ADS_EVENT,
  ROTATE_MS,
  addDismissed,
  areAllHidden,
  clampIndex,
  nextIndex,
  prevIndex,
  readDismissed,
  setAllHidden,
  shouldAutoRotate,
  slideLabel,
} from "@/features/recommendations/adSlot";
import type { Rec } from "./PickCard";

type Props = {
  /** Where the slot sits, for example "home-middle". Used for the region name only. */
  placement: string;
  /** "slideshow" rotates up to 5 picks; "card" shows one pick (used inside result grids). */
  variant?: "slideshow" | "card";
  /** "personal" uses the shopper's taste; "similar" needs productRef. */
  source?: "personal" | "similar";
  /** Product being viewed (never suggested back, and used for "similar"). */
  productRef?: string;
  /** Skips this many picks, so slots on one page show different products. */
  offset?: number;
  className?: string;
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function price(l: Rec) {
  return l.currency === "INR" ? `₹ ${l.price}` : `${l.currency} ${l.price}`;
}

/**
 * A clearly labelled suggestion slot. Suggestions come from the recommendation engine
 * (sellers on ShopNGo, picked from the shopper's activity). Every suggestion can be closed,
 * all can be hidden, and the slot renders nothing when there is nothing to show.
 */
export function ProductAdSlot({ placement, variant = "slideshow", source = "personal", productRef, offset = 0, className = "" }: Props) {
  const { loading: authLoading, getIdToken } = useAuth();
  const [recs, setRecs] = useState<Rec[] | null>(null); // null = still loading
  const [personalised, setPersonalised] = useState(false);
  const [hiddenAll, setHiddenAll] = useState(false);
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [announce, setAnnounce] = useState("");
  const regionName = useMemo(() => `Suggested products, ${placement.replace(/[-_]/g, " ")}`, [placement]);
  const tokenRef = useRef(getIdToken);
  tokenRef.current = getIdToken;

  // Preferences: hidden-all flag, reduced motion, tab visibility.
  useEffect(() => {
    const sync = () => setHiddenAll(areAllHidden(storage()));
    sync();
    window.addEventListener(ADS_EVENT, sync);
    window.addEventListener("storage", sync);
    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const onMq = () => setReduced(Boolean(mq?.matches));
    onMq();
    mq?.addEventListener?.("change", onMq);
    const onVis = () => setTabHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener(ADS_EVENT, sync);
      window.removeEventListener("storage", sync);
      mq?.removeEventListener?.("change", onMq);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Load suggestions. Any problem leaves the slot empty.
  useEffect(() => {
    if (authLoading || hiddenAll) return;
    let cancelled = false;
    (async () => {
      try {
        const dismissed = readDismissed(storage());
        const exclude = [...(productRef ? [productRef] : []), ...dismissed.slice(-90)].join(",");
        const wanted = variant === "card" ? 1 : 5;
        const url =
          source === "similar" && productRef
            ? `/api/recommendations/similar?product=${encodeURIComponent(productRef)}`
            : `/api/recommendations/personal?limit=${wanted}&offset=${Math.max(0, offset)}${exclude ? `&exclude=${encodeURIComponent(exclude)}` : ""}`;
        const res = await fetch(url, { headers: await recHeaders(tokenRef.current), cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const data = (await res.json()) as { recommendations?: Rec[]; personalised?: boolean };
        if (cancelled) return;
        const gone = new Set(readDismissed(storage()));
        const list = (data.recommendations ?? []).filter((r) => r && r.id && r.slug && r.title && r.id !== productRef && !gone.has(r.id)).slice(0, wanted);
        setPersonalised(source === "similar" ? true : Boolean(data.personalised));
        setRecs(list);
      } catch {
        if (!cancelled) setRecs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, hiddenAll, source, productRef, offset, variant]);

  const count = recs?.length ?? 0;
  const auto = variant === "slideshow" && shouldAutoRotate({ count, userPaused, hovering, focused, tabHidden, reducedMotion: reduced });

  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => setIndex((i) => nextIndex(i, count)), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [auto, count, index]);

  const close = useCallback(
    (rec: Rec) => {
      addDismissed(storage(), rec.id);
      void track({ type: "DISMISS", productRef: rec.id }, tokenRef.current);
      setAnnounce(`Suggestion closed: ${rec.title}. We will not show it again.`);
      setRecs((prev) => {
        const next = (prev ?? []).filter((r) => r.id !== rec.id);
        setIndex((i) => clampIndex(i, next.length));
        return next;
      });
    },
    []
  );

  const hideAll = useCallback(() => {
    setAllHidden(storage(), true);
    setHiddenAll(true);
    try {
      window.dispatchEvent(new Event(ADS_EVENT));
    } catch {
      /* ignore */
    }
  }, []);

  if (hiddenAll) return null;
  // Still loading: keep the space so the page does not jump.
  if (recs === null) {
    return <div aria-hidden="true" className={`min-h-[13.5rem] ${className}`} />;
  }
  if (recs.length === 0) return null;

  const safeIndex = clampIndex(index, recs.length);
  const multi = recs.length > 1 && variant === "slideshow";
  const label = personalised ? "Suggested for you" : "Popular on ShopNGo";
  const motion = reduced ? "" : "transition-transform duration-700 ease-out";

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label={regionName}
      className={`mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 ${className}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-amber-50 shadow-sm dark:border-zinc-700 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-900 dark:text-teal-300">
            {label}
            <span className="ml-2 font-normal normal-case tracking-normal text-gray-700 dark:text-zinc-400">
              Suggestions from sellers on ShopNGo
            </span>
          </p>
          <button
            type="button"
            onClick={hideAll}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-zinc-300"
          >
            Hide all suggestions
          </button>
        </div>

        <div className="overflow-hidden" aria-live={auto ? "off" : "polite"} aria-atomic="false">
          <div className={`flex ${motion}`} style={{ transform: `translateX(-${safeIndex * 100}%)` }}>
            {recs.map((l, i) => {
              const img = getListingImageUrl(l);
              const active = i === safeIndex;
              return (
                <div
                  key={l.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={slideLabel(i, recs.length)}
                  aria-hidden={active ? undefined : true}
                  inert={!active}
                  className="relative min-h-[10.5rem] w-full shrink-0 px-4 pb-3 pt-2 sm:px-5"
                >
                  <div className="flex items-center gap-4 pr-12">
                    <Link
                      href={`/products/${l.slug}`}
                      className="block shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                      tabIndex={active ? 0 : -1}
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={getListingImageAlt(l)}
                          loading="lazy"
                          width={144}
                          height={144}
                          className="h-28 w-28 rounded-xl bg-gray-50 object-cover sm:h-36 sm:w-36"
                        />
                      ) : (
                        <div className="h-28 w-28 rounded-xl bg-teal-100 sm:h-36 sm:w-36 dark:bg-zinc-800" aria-hidden="true" />
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/products/${l.slug}`}
                        className="line-clamp-2 text-base font-semibold text-gray-900 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:text-lg dark:text-zinc-100"
                        tabIndex={active ? 0 : -1}
                      >
                        {l.title}
                      </Link>
                      <p className="mt-1 text-base font-semibold text-teal-800 dark:text-teal-300">{price(l)}</p>
                      {l.store?.name && <p className="text-sm text-gray-700 dark:text-zinc-400">Sold by {l.store.name}</p>}
                      {l.reason && (
                        <p className="mt-2 inline-block rounded-full bg-white/80 px-2.5 py-1 text-xs text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-200 dark:ring-teal-900">
                          {l.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => close(l)}
                    aria-label={`Close this suggestion for ${l.title}`}
                    tabIndex={active ? 0 : -1}
                    className="absolute right-2 top-1 flex h-11 w-11 items-center justify-center rounded-full text-gray-800 hover:bg-gray-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                    <span className="sr-only">Close</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {multi && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-3 sm:px-5">
            <button
              type="button"
              onClick={() => setIndex(prevIndex(safeIndex, recs.length))}
              aria-label="Previous suggestion"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <span aria-hidden="true">‹</span>
            </button>
            {!reduced && (
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
                className="flex h-10 min-w-[4.5rem] items-center justify-center rounded-full border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {userPaused ? "Play" : "Pause"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIndex(nextIndex(safeIndex, recs.length))}
              aria-label="Next suggestion"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <span aria-hidden="true">›</span>
            </button>
            <div className="ml-2 flex items-center">
              {recs.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={slideLabel(i, recs.length)}
                  aria-current={i === safeIndex ? "true" : undefined}
                  className="group flex h-8 w-6 items-center justify-center focus-visible:outline-none"
                >
                  <span
                    className={`block h-2.5 rounded-full transition-all group-focus-visible:ring-2 group-focus-visible:ring-teal-600 group-focus-visible:ring-offset-1 ${
                      i === safeIndex ? "w-6 bg-teal-700 dark:bg-teal-400" : "w-2.5 bg-gray-400 dark:bg-zinc-500"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}
