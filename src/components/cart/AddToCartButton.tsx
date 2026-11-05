"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Button } from "@/components/ui";
import { apiCall } from "@/lib/client/api";

type Props = {
  listingId: string;
  productTitle: string;
  /** Digital items and services are not bought in bulk, but quantity stays editable in the cart. */
  size?: "sm" | "md" | "lg";
  outOfStock?: boolean;
};

export function AddToCartButton({ listingId, productTitle, size = "lg", outOfStock = false }: Props) {
  const { appUser, firebaseUser, loading, getIdToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function add() {
    setBusy(true);
    setMessage(null);
    // Read the current quantity so adding twice increases it instead of resetting it.
    const cart = await apiCall<{ items?: { listingId: string; quantity: number }[] }>(getIdToken, "/api/cart");
    const current = cart.data.items?.find((i) => i.listingId === listingId)?.quantity ?? 0;
    const res = await apiCall(getIdToken, "/api/cart/items", {
      method: "POST",
      body: { listingId, quantity: Math.min(current + 1, 99) },
    });
    setBusy(false);
    if (res.ok) {
      setMessage({ kind: "ok", text: `${productTitle} added to your cart.` });
    } else if (res.status === 401) {
      setMessage({ kind: "error", text: "Please sign in to add items to your cart." });
    } else {
      setMessage({ kind: "error", text: res.data.error ?? "Could not add this item. Please try again." });
    }
  }

  if (outOfStock) {
    return (
      <Button size={size} disabled>
        Out of stock
      </Button>
    );
  }

  if (loading) {
    return (
      <Button size={size} disabled>
        Add to cart
      </Button>
    );
  }

  if (!appUser && !firebaseUser) {
    return (
      <div>
        <Link href="/auth/sign-in">
          <Button size={size}>Sign in to add to cart</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Button size={size} onClick={add} loading={busy}>
        {busy ? "Adding" : "Add to cart"}
      </Button>
      <p role="status" aria-live="polite" className="mt-2 text-sm">
        {message && (
          <span className={message.kind === "ok" ? "text-emerald-800" : "text-red-700"}>
            {message.text}{" "}
            {message.kind === "ok" && (
              <Link href="/cart" className="font-medium underline">
                Go to cart
              </Link>
            )}
          </span>
        )}
      </p>
    </div>
  );
}
