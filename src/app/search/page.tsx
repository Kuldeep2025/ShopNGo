"use client";

import { Fragment, useCallback, useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Spinner, Alert } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  type PublicCategoryDTO,
  type PublicListingDTO,
} from "@/features/catalogue";
import { pickArtworkVariant } from "@/features/cinematic/layoutEngine";
import { getListingImageUrl, getListingImageAlt } from "@/features/catalogue/media";
import { useAuth } from "@/features/identity/AuthProvider";
import { track } from "@/features/recommendations/track";
import { ProductAdSlot } from "@/components/insights/ProductAdSlot";
import { Copy } from "@/features/copy/Copy";
import { PriceTag } from "@/features/pricing/PriceTag";

type VoiceResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type VoiceRecognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: VoiceResultEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type VoiceRecognitionConstructor = new () => VoiceRecognition;

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getIdToken } = useAuth();
  const tokenRef = useRef(getIdToken);
  tokenRef.current = getIdToken;

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [categories, setCategories] = useState<PublicCategoryDTO[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const appliedQuery = searchParams.toString();

  const [listings, setListings] = useState<PublicListingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [suggestions, setSuggestions] = useState<PublicListingDTO[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const voiceRef = useRef<VoiceRecognition | null>(null);

  useEffect(() => {
    setVoiceSupported(
      typeof window !== "undefined" &&
        ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    );
  }, []);

  useEffect(() => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions((data.listings ?? []).slice(0, 5));
        }
      } catch {
        /* ignore */
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  function startVoice() {
    const SR =
      (window as unknown as { SpeechRecognition?: VoiceRecognitionConstructor; webkitSpeechRecognition?: VoiceRecognitionConstructor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: VoiceRecognitionConstructor }).webkitSpeechRecognition;
    if (!SR) {
      setVoiceMessage("Voice search is not supported in this browser – please type instead.");
      setTimeout(() => setVoiceMessage(null), 4000);
      return;
    }
    // Reuse or create a recognition instance; stop any active session first.
    const rec = voiceRef.current ?? new SR();
    voiceRef.current = rec;
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (ev: VoiceResultEvent) => {
      const text = ev.results[0]?.[0]?.transcript ?? "";
      if (text) {
        setQ(text);
        setShowSuggest(false);
        setVoiceMessage(`Heard: “${text}”`);
        setTimeout(() => setVoiceMessage(null), 3000);
      }
    };
    rec.onerror = (ev: Event & { error?: string }) => {
      setVoiceListening(false);
      const reason = ev.error ?? "error";
      setVoiceMessage(
        reason === "not-allowed"
          ? "Microphone permission denied – allow mic access to use voice search."
          : reason === "no-speech"
            ? "Didn't catch that – try speaking again."
            : "Voice search failed – please type your search."
      );
      setTimeout(() => setVoiceMessage(null), 4000);
    };
    rec.onend = () => setVoiceListening(false);
    setVoiceMessage(null);
    setVoiceListening(true);
    try {
      rec.start();
    } catch {
      setVoiceListening(false);
    }
  }

  const runSearch = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams(appliedQuery);
      if (cursor) params.set("cursor", cursor);

      try {
        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Search failed");
          setListings([]);
          setTotal(null);
          setNextCursor(null);
          return;
        }
        if (cursor) {
          setListings((prev) => [...prev, ...(data.listings ?? [])]);
        } else {
          setListings(data.listings ?? []);
        }
        setTotal(typeof data.total === "number" ? data.total : null);
        setNextCursor(data.nextCursor ?? null);
        setSearched(true);
        const typed = params.get("q")?.trim();
        if (!cursor && typed && typed.length >= 2) void track({ type: "SEARCH", query: typed.slice(0, 80) }, tokenRef.current);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [appliedQuery]
  );

  // Run the search whenever the address (filters) changes, including back/forward.
  useEffect(() => {
    const p = new URLSearchParams(appliedQuery);
    setQ(p.get("q") ?? "");
    setType(p.get("type") ?? "");
    setMinPrice(p.get("minPrice") ?? "");
    setMaxPrice(p.get("maxPrice") ?? "");
    setSort(p.get("sort") ?? "newest");
    setCategory(p.get("category") ?? "");
    runSearch();
  }, [appliedQuery, runSearch]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCategories(d?.categories ?? []))
      .catch(() => undefined);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggest(false);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (sort && sort !== "newest") params.set("sort", sort);
    const next = params.toString();
    if (next === appliedQuery) runSearch();
    else router.push(next ? `/search?${next}` : "/search");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Search</h1>
        <p className="mt-1 text-gray-600">
          <Copy id="search.intro" />
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <label htmlFor="q" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
              Keywords
            </label>
            <div className="relative mt-1 flex gap-2">
              <Input
                id="q"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setShowSuggest(true);
                }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 180)}
                placeholder="What are you looking for?"
                className="flex-1"
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="search-suggestions"
              />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={startVoice}
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg border px-3 transition",
                    voiceListening
                      ? "animate-pulse border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                      : "border-gray-300 text-gray-600 hover:bg-teal-50 hover:text-teal-800 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  )}
                  aria-label={voiceListening ? "Listening…" : "Search by voice"}
                  title="Voice search"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
            </div>
            {showSuggest && suggestions.length > 0 && (
              <ul
                id="search-suggestions"
                role="listbox"
                className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
              >
                {suggestions.map((s) => (
                  <li key={s.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-teal-50 dark:hover:bg-zinc-800"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQ(s.title);
                        setShowSuggest(false);
                        router.push(`/products/${s.slug}`);
                      }}
                    >
                      <span className="truncate font-medium text-gray-900 dark:text-zinc-100">
                        {s.title}
                      </span>
                      <span className="ml-2 shrink-0 text-teal-700 dark:text-teal-400">
                        {s.currency === "INR" ? "₹" : s.currency} {s.price}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  <option value={c.slug}>All {c.name}</option>
                  {(c.children ?? []).map((child) => (
                    <option key={child.id} value={child.slug}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All types</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PRODUCT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700">
              Sort
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="title">Name A–Z</option>
            </select>
          </div>
          <div>
            <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700">
              Min price (₹)
            </label>
            <Input
              id="minPrice"
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700">
              Max price (₹)
            </label>
            <Input
              id="maxPrice"
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button type="submit" loading={loading}>
            Search
          </Button>
        </div>
      </form>

      {voiceMessage && (
        <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:bg-teal-950 dark:text-teal-300" role="status">
          {voiceMessage}
        </p>
      )}

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      <section className="mt-10" aria-live="polite">
        {loading && listings.length === 0 ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Searching" />
          </div>
        ) : searched && listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
            <p className="text-lg font-medium text-gray-900"><Copy id="search.empty.title" /></p>
            <p className="mt-2 text-sm text-gray-600">
              <Copy id="search.empty.hint" />
            </p>
            <Link href="/categories" className="mt-6 inline-block">
              <Button variant="outline">Browse categories</Button>
            </Link>
          </div>
        ) : listings.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {total !== null
                ? `Showing ${listings.length} of ${total} result${total !== 1 ? "s" : ""}`
                : `${listings.length} result${listings.length !== 1 ? "s" : ""}${nextCursor ? "+" : ""}`}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l, idx) => {
                const artwork = pickArtworkVariant(l, "general");
                const imageUrl = getListingImageUrl(l, true);
                return (
                  <Fragment key={l.id}>
                  <li>
                    <Link
                      href={`/products/${l.slug}`}
                      className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      <div className={`mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${artwork.gradient} text-5xl text-white transition group-hover:brightness-110`} aria-hidden={imageUrl ? undefined : "true"}>
                        {imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={imageUrl}
                            alt={getListingImageAlt(l)}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          artwork.emoji
                        )}
                      </div>
                      <h2 className="font-semibold text-gray-900 group-hover:text-teal-800">
                        {l.title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {PRODUCT_TYPE_LABELS[l.productType] ?? l.productType}
                        {l.store?.name ? ` · ${l.store.name}` : ""}
                      </p>
                      <PriceTag className="mt-3" price={l.price} currency={l.currency} strikePrice={l.pricing?.strikePrice} percentOff={l.pricing?.percentOff} saleEndsAt={l.pricing?.saleEndsAt} />
                      {l.inStock === false && (
                        <p className="mt-1 text-sm font-medium text-red-700">Out of stock</p>
                      )}
                    </Link>
                  </li>
                  {(idx + 1) % 8 === 0 && (
                    <li className="sm:col-span-2 lg:col-span-3">
                      <ProductAdSlot placement={`search-results-${(idx + 1) / 8}`} variant="card" offset={(idx + 1) / 8 - 1} className="!px-0 sm:!px-0" />
                    </li>
                  )}
                  </Fragment>
                );
              })}
            </ul>
            {nextCursor && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  loading={loading}
                  onClick={() => runSearch(nextCursor)}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="lg" label="Loading search" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
