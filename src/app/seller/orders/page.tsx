"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy } from "@/features/copy/Copy";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Badge, Button, Spinner } from "@/components/ui";
import { SignInRequired } from "@/components/feedback/SignInRequired";
import { apiCall, formatMoney } from "@/lib/client/api";
import { getNextFulfillmentStatus } from "@/features/orders/transitions";

type SellerOrder = {
  id: string;
  status: string;
  subtotal: string;
  createdAt: string;
  order: { id: string; shippingAddress: Record<string, string | null> | null };
  items: { id: string; titleSnapshot: string; quantity: number; productType: string }[];
};

const NEXT_LABEL: Record<string, string> = {
  PROCESSING: "Start preparing",
  SHIPPED: "Mark as shipped",
  DELIVERED: "Mark as delivered",
};

export default function SellerOrdersPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const isSeller = !!appUser && (appUser.roles.includes("SELLER") || appUser.roles.includes("ADMIN"));

  const load = useCallback(async () => {
    const res = await apiCall<{ orders?: SellerOrder[] }>(getIdToken, "/api/seller/orders");
    if (res.ok) setOrders(res.data.orders ?? []);
    else setError(res.data.error ?? "Could not load orders.");
    setLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!isSeller) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, isSeller, load]);

  async function advance(id: string, status: string) {
    setActing(id);
    setError(null);
    const res = await apiCall(getIdToken, "/api/seller/orders", {
      method: "PATCH",
      body: { sellerOrderId: id, status },
    });
    setActing(null);
    if (!res.ok) setError(res.data.error ?? "Could not update the order.");
    await load();
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading orders" />
      </div>
    );
  }
  if (!appUser) return <SignInRequired title="Sign in to manage orders" />;
  if (!isSeller) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sellers only</h1>
        <Link href="/seller/apply" className="mt-4 inline-block text-teal-700 underline">
          Apply to sell on ShopNGo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Orders for my store</h1>
      <p className="mt-1 text-sm">
        <Link href="/seller/listings" className="text-teal-700 underline">
          My listings
        </Link>
      </p>
      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}
      {orders.length === 0 ? (
        <p className="mt-8 text-gray-500"><Copy id="orders.empty" /></p>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => {
            const next = getNextFulfillmentStatus(o.status);
            const a = o.order.shippingAddress;
            return (
              <li key={o.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">Order {o.order.id.slice(-8)}</h2>
                  <Badge variant={o.status === "CANCELLED" ? "error" : o.status === "PENDING_PAYMENT" ? "warning" : "success"}>
                    {o.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </div>
                <ul className="mt-2 text-sm text-gray-700">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.titleSnapshot}, quantity {i.quantity}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm font-medium">Subtotal {formatMoney(o.subtotal)}</p>
                {a && (
                  <p className="mt-1 text-sm text-gray-600">
                    Ship to: {[a.line1, a.line2, a.city, a.state, a.postalCode].filter(Boolean).join(", ")}
                  </p>
                )}
                {next && (
                  <Button className="mt-3" loading={acting === o.id} onClick={() => advance(o.id, next)}>
                    {NEXT_LABEL[next]}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
