"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy } from "@/features/copy/Copy";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Button, Alert, Spinner, Badge } from "@/components/ui";
import { ProductAdSlot } from "@/components/insights/ProductAdSlot";
import { SignInRequired } from "@/components/feedback/SignInRequired";
import type { QuoteResult } from "@/features/cart/quote";
import { formatIst } from "@/features/pricing/effectivePrice";

type CartItem = {
  id: string;
  listingId: string;
  quantity: number;
  listing: {
    id: string;
    title: string;
    slug: string;
    price: string;
    strikePrice?: string | null;
    percentOff?: number;
    saleEndsAt?: string | null;
    currency: string;
    productType: string;
    stock: number | null;
    available: boolean;
    store: { id: string; name: string; slug: string };
  } | null;
};

export default function CartPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [cartRes, quoteRes] = await Promise.all([
        fetch("/api/cart", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/cart/quote", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (cartRes.ok) {
        const data = await cartRes.json();
        setItems(data.items ?? []);
      }
      if (quoteRes.ok) {
        const data = await quoteRes.json();
        setQuote(data.quote ?? null);
      }
    } catch {
      setError("Could not load your cart.");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, appUser, load]);

  async function updateQty(listingId: string, quantity: number) {
    setActing(true);
    setError(null);
    const token = await getIdToken();
    if (!token) {
      setActing(false);
      return;
    }
    try {
      const res = await fetch("/api/cart/items", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      await load();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setActing(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading cart" />
      </div>
    );
  }

  if (!appUser) {
    return (
      <SignInRequired
        title="Your cart is waiting"
        message="Sign in to save items and check out when you are ready."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Your cart</h1>
      <p className="mt-1 text-gray-600">
        <Copy id="cart.intro" />
      </p>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      {quote && !quote.allAvailable && quote.issues.length > 0 && (
        <Alert variant="warning" title="Some items need attention" className="mt-6">
          <ul className="mt-1 list-inside list-disc text-sm">
            {quote.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </Alert>
      )}

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <p className="text-lg font-medium text-gray-900"><Copy id="cart.empty.title" /></p>
          <p className="mt-2 text-sm text-gray-600">
            <Copy id="cart.empty.hint" />
          </p>
          <Link href="/search" className="mt-6 inline-block">
            <Button>Browse products</Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                {item.listing ? (
                  <>
                    <Link
                      href={`/products/${item.listing.slug}`}
                      className="font-semibold text-gray-900 hover:text-teal-800"
                    >
                      {item.listing.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {item.listing.store.name} ·{" "}
                      {item.listing.currency === "INR" ? "₹" : item.listing.currency}{" "}
                      {item.listing.price}
                      {item.listing.strikePrice && (item.listing.percentOff ?? 0) > 0 && (
                        <>
                          {" "}
                          <s><span className="sr-only">Original price </span>{item.listing.strikePrice}</s>{" "}
                          <span className="font-semibold text-emerald-700">{item.listing.percentOff}% off</span>
                          {item.listing.saleEndsAt && <> · Sale ends {formatIst(item.listing.saleEndsAt)}</>}
                        </>
                      )}
                      {!item.listing.available && (
                        <Badge variant="error" className="ml-2">
                          Unavailable
                        </Badge>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">This product is no longer listed</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  disabled={acting || item.quantity <= 1}
                  onClick={() => updateQty(item.listingId, item.quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-medium" aria-live="polite" aria-label={`Quantity ${item.quantity}`}>
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  disabled={acting}
                  onClick={() => updateQty(item.listingId, item.quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={acting}
                  onClick={() => updateQty(item.listingId, 0)}
                  aria-label="Remove item"
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {quote && items.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-xl font-semibold text-teal-800">
              {quote.currency === "INR" ? "₹" : quote.currency} {quote.subtotal}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Final total is confirmed at checkout.
          </p>
          <div className="mt-6">
            {quote.allAvailable ? (
              <Link href="/checkout" className="block">
                <Button fullWidth size="lg">
                  Proceed to checkout
                </Button>
              </Link>
            ) : (
              <Button fullWidth size="lg" disabled>
                Proceed to checkout
              </Button>
            )}
          </div>
        </div>
      )}

      <ProductAdSlot placement="cart-bottom" className="mt-8 !px-0 sm:!px-0" />

      <p className="mt-10 text-center text-sm text-gray-500">
        <Link href="/search" className="text-teal-700 hover:underline">
          ← Continue shopping
        </Link>
      </p>
    </div>
  );
}
