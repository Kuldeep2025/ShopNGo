"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { PRODUCT_TYPE_LABELS, type PublicListingDTO } from "@/features/catalogue";
import { getListingImageUrl, getListingImageAlt } from "@/features/catalogue/media";
import { RotatingTagline } from "@/features/brand/RotatingTagline";
import {
  computeLayout,
  persistLayout,
  readPersistedLayout,
  readSession,
  pickArtworkVariant,
  type LayoutRow,
  type SessionSignals,
  type LifestyleTag,
} from "./layoutEngine";

function SkeletonHome() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100" aria-hidden="true">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 h-[42vw] max-h-[420px] min-h-[220px] animate-pulse rounded-2xl bg-zinc-900" />
        <div className="mb-3 h-6 w-40 animate-pulse rounded bg-zinc-800" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-40 w-[28%] min-w-[140px] shrink-0 animate-pulse rounded-xl bg-zinc-900"
            />
          ))}
        </div>
        <div className="mt-10 mb-3 h-6 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] w-[22%] min-w-[120px] shrink-0 animate-pulse rounded-xl bg-zinc-900"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductRailCard({
  product,
  tag,
  vertical,
}: {
  product: PublicListingDTO;
  tag: LifestyleTag;
  vertical?: boolean;
}) {
  const art = pickArtworkVariant(product, tag);
  const imageUrl = getListingImageUrl(product, true);
  return (
    <Link
      href={`/products/${product.slug}`}
      className={
        vertical
          ? "group relative block w-[42%] min-w-[140px] max-w-[200px] shrink-0 snap-start overflow-hidden rounded-xl bg-zinc-900 shadow-lg transition duration-300 ease-out hover:z-10 hover:scale-105 hover:shadow-2xl sm:w-[28%] md:w-[22%]"
          : "group relative block w-[48%] min-w-[160px] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-xl bg-zinc-900 shadow-lg transition duration-300 ease-out hover:z-10 hover:scale-105 hover:shadow-2xl sm:w-[32%] md:w-[24%]"
      }
    >
      <div
        className={
          vertical
            ? `flex aspect-[2/3] items-center justify-center bg-gradient-to-br ${art.gradient} text-4xl`
            : `flex aspect-video items-center justify-center bg-gradient-to-br ${art.gradient} text-4xl`
        }
      >
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={getListingImageAlt(product)}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="opacity-80 transition group-hover:scale-110 group-hover:opacity-100">
            {art.emoji}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium text-zinc-100 group-hover:text-white">
          {product.title}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
        </p>
        <p className="mt-1 text-sm font-semibold text-teal-400">
          {product.currency === "INR" ? "₹" : product.currency} {product.price}
        </p>
      </div>
    </Link>
  );
}

function Rail({
  title,
  products,
  tag,
  vertical,
}: {
  title: string;
  products: PublicListingDTO[];
  tag: LifestyleTag;
  vertical?: boolean;
}) {
  if (products.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-3 px-4 text-lg font-semibold text-zinc-100 sm:px-6 sm:text-xl">
        {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin snap-x sm:px-6">
        {products.map((p) => (
          <ProductRailCard key={p.id} product={p} tag={tag} vertical={vertical} />
        ))}
      </div>
    </section>
  );
}

export function CinematicHome({
  listings,
}: {
  listings: PublicListingDTO[];
}) {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<LayoutRow[] | null>(null);
  const [signals, setSignals] = useState<SessionSignals | null>(null);

  useEffect(() => {
    // Instant skeleton from last layout (anti-flicker)
    const persisted = readPersistedLayout();
    if (persisted) {
      setRows(persisted);
    }

    const session = readSession();
    setSignals(session);

    // Recalculate after paint
    const next = computeLayout(session);
    persistLayout(next);
    setRows(next);
    setReady(true);
  }, []);

  if (!rows || !signals) {
    return <SkeletonHome />;
  }

  const tag = signals.lifestyleTag;
  const byType = (types: string[]) =>
    listings.filter((l) => types.includes(l.productType));
  const byHint = (hint?: string) => {
    if (!hint) return listings.slice(0, 8);
    return listings.filter(
      (l) =>
        l.category?.slug?.includes(hint) ||
        l.category?.name?.toLowerCase().includes(hint) ||
        l.title.toLowerCase().includes(hint)
    ).length
      ? listings.filter(
          (l) =>
            l.category?.slug?.includes(hint) ||
            l.category?.name?.toLowerCase().includes(hint) ||
            l.title.toLowerCase().includes(hint)
        )
      : listings.slice(0, 6);
  };

  return (
    <div
      className={`min-h-screen bg-[#0a0a0b] text-zinc-100 transition-opacity duration-300 ${
        ready ? "opacity-100" : "opacity-90"
      }`}
    >
      {rows.map((row) => {
        switch (row.kind) {
          case "hero_banner": {
            const hero = listings[0];
            const heroImage = hero ? getListingImageUrl(hero, true) : null;
            return (
              <section
                key={row.id}
                className="relative mb-8 overflow-hidden border-b border-zinc-800/80"
              >
                <div className="relative mx-auto aspect-[16/9] max-h-[480px] min-h-[240px] w-full max-w-6xl bg-gradient-to-br from-zinc-900 via-teal-950/40 to-zinc-950 sm:rounded-b-2xl">
                  {heroImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={heroImage}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover opacity-35"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/30 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
                    <p className="mb-2 text-xs font-medium uppercase tracking-widest text-teal-400/90">
                      ShopNGo
                    </p>
                    <RotatingTagline className="mb-1 text-sm sm:text-base" />
                    <h1 className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                      {hero ? hero.title : "Shop smarter. Buy with confidence."}
                    </h1>
                    <p className="mt-3 max-w-lg text-sm text-zinc-400 sm:text-base">
                      {hero?.description?.slice(0, 120) ??
                        "Discover, compare, and track — one marketplace for physical, digital, and service products."}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link href={hero ? `/products/${hero.slug}` : "/search"}>
                        <Button
                          size="lg"
                          className="bg-white text-zinc-900 hover:bg-zinc-100"
                        >
                          {hero ? "View product" : "Start shopping"}
                        </Button>
                      </Link>
                      <Link href="/search">
                        <Button
                          size="lg"
                          variant="outline"
                          className="border-zinc-600 text-zinc-100 hover:bg-zinc-800"
                        >
                          Browse all
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          case "trending":
            return (
              <Rail
                key={row.id}
                title="Trending now"
                products={listings.slice(0, 8)}
                tag={tag}
              />
            );

          case "continue_browsing":
            return (
              <Rail
                key={row.id}
                title="Continue browsing"
                products={[...listings].reverse().slice(0, 6)}
                tag={tag}
              />
            );

          case "category_rail":
            return (
              <Rail
                key={row.id}
                title={
                  row.categoryHint === "electronics"
                    ? "Electronics & tech"
                    : row.categoryHint === "courses"
                      ? "Courses & learning"
                      : "Picked for you"
                }
                products={byHint(row.categoryHint)}
                tag={tag}
              />
            );

          case "vertical_collection":
            return (
              <Rail
                key={row.id}
                title="Special collections"
                products={byType(["COURSE", "EBOOK", "E_NOTE", "SERVICE"]).concat(
                  listings
                ).slice(0, 8)}
                tag={tag}
                vertical
              />
            );

          case "value_props":
            return (
              <section key={row.id} className="mx-auto mb-12 max-w-6xl px-4 sm:px-6">
                <h2 className="mb-6 text-lg font-semibold text-zinc-100 sm:text-xl">
                  Why ShopNGo
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      title: "Clear answers",
                      body: "Product help grounded in real listing details.",
                    },
                    {
                      title: "Compare options",
                      body: "Price, type, and store side by side.",
                    },
                    {
                      title: "Verified sellers",
                      body: "Stores reviewed before they go live.",
                    },
                    {
                      title: "Order control",
                      body: "Track, cancel, and update when rules allow.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-teal-800/50"
                    >
                      <h3 className="font-semibold text-zinc-100">{item.title}</h3>
                      <p className="mt-2 text-sm text-zinc-500">{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            );

          case "journey":
            return (
              <section key={row.id} className="mx-auto mb-12 max-w-6xl px-4 sm:px-6">
                <h2 className="mb-6 text-lg font-semibold text-zinc-100 sm:text-xl">
                  From search to delivery
                </h2>
                <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { step: "01", title: "Discover", text: "Search and filter what you need." },
                    { step: "02", title: "Understand", text: "Read details and store info." },
                    { step: "03", title: "Compare", text: "Check options side by side." },
                    { step: "04", title: "Buy", text: "Cart, address, checkout." },
                    { step: "05", title: "Track", text: "Follow status end to end." },
                    { step: "06", title: "Receive", text: "Delivery or digital access." },
                  ].map((item) => (
                    <li
                      key={item.step}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                    >
                      <span className="text-xs font-semibold text-teal-500">
                        {item.step}
                      </span>
                      <h3 className="mt-1 font-semibold text-zinc-100">{item.title}</h3>
                      <p className="mt-1 text-sm text-zinc-500">{item.text}</p>
                    </li>
                  ))}
                </ol>
              </section>
            );

          case "cta_band":
            return (
              <section
                key={row.id}
                className="border-t border-zinc-800 bg-gradient-to-r from-teal-950 to-zinc-950"
              >
                <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">
                    Ready to explore?
                  </h2>
                  <p className="mx-auto mt-3 max-w-lg text-zinc-400">
                    Browse the catalogue or create an account to save addresses
                    and place orders.
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link href="/search">
                      <Button
                        size="lg"
                        className="bg-white text-zinc-900 hover:bg-zinc-100"
                      >
                        Search products
                      </Button>
                    </Link>
                    <Link href="/auth/sign-in">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-zinc-600 text-zinc-100 hover:bg-zinc-800"
                      >
                        Create account
                      </Button>
                    </Link>
                  </div>
                </div>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
