"use client";

import { useEffect, useState } from "react";
import { Copy } from "@/features/copy/Copy";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Badge, Spinner } from "@/components/ui";
import { SignInRequired } from "@/components/feedback/SignInRequired";

type Order = {
  id: string;
  status: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
  sellerOrders: { id: string; status: string; store: { name: string } }[];
  items: { titleSnapshot: string; quantity: number; priceSnapshot: string }[];
};

export default function OrdersPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser) {
      setLoading(false);
      return;
    }
    (async () => {
      const token = await getIdToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
      setLoading(false);
    })();
  }, [appUser, authLoading, getIdToken]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading orders" />
      </div>
    );
  }

  if (!appUser) {
    return (
      <SignInRequired
        title="Sign in to see orders"
        message="Your order history stays with your account. Sign in to view past and active orders."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500"><Copy id="orders.empty" /></p>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/orders/${o.id}`} className="font-medium text-teal-800 hover:underline">
                    Order {o.id.slice(-8)}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString()} · {o.items.length} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      o.status === "PAID" || o.status === "DELIVERED"
                        ? "success"
                        : o.status === "CANCELLED"
                          ? "error"
                          : "warning"
                    }
                  >
                    {o.status}
                  </Badge>
                  <p className="mt-1 font-semibold text-gray-900">
                    {o.currency} {o.totalAmount}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
