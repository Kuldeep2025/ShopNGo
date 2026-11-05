"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DEMO_NOTICE } from "@/features/legal/demoNotice";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Badge, Button, Spinner } from "@/components/ui";
import { SignInRequired } from "@/components/feedback/SignInRequired";
import { apiCall, formatMoney } from "@/lib/client/api";
import { DeliveryTracking } from "@/features/delivery/DeliveryTracking";
import { OrderMessaging } from "@/features/messaging/ui/OrderMessaging";

type Order = {
  id: string;
  status: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
  shippingAddress: Record<string, string | null> | null;
  sellerOrders: { id: string; status: string; store: { name: string; slug: string } }[];
  items: { id: string; listingId: string; titleSnapshot: string; quantity: number; priceSnapshot: string }[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  PAID: "Paid",
  PROCESSING: "Being prepared",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const placed = useSearchParams().get("placed") === "1";
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiCall<{ order?: Order }>(getIdToken, `/api/orders/${id}`);
    if (res.ok && res.data.order) setOrder(res.data.order);
    else setNotFound(true);
    setLoading(false);
  }, [getIdToken, id]);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, appUser, load]);

  async function pay() {
    setBusy(true);
    setError(null);
    const res = await apiCall(getIdToken, "/api/payments/mock", {
      method: "POST",
      body: { orderId: id, outcome: "success" },
    });
    setBusy(false);
    if (!res.ok) setError(res.data.error ?? "Payment could not be completed.");
    await load();
  }

  async function cancel() {
    if (!window.confirm("Cancel this order?")) return;
    setBusy(true);
    setError(null);
    const res = await apiCall<{ reason?: string }>(getIdToken, `/api/orders/${id}`, {
      method: "PATCH",
      body: { action: "cancel" },
    });
    setBusy(false);
    if (!res.ok) setError(res.data.reason ?? res.data.error ?? "Could not cancel this order.");
    await load();
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading order" />
      </div>
    );
  }
  if (!appUser) return <SignInRequired title="Sign in to see this order" />;
  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Order not found</h1>
        <Link href="/orders" className="mt-6 inline-block">
          <Button variant="outline">Back to my orders</Button>
        </Link>
      </div>
    );
  }

  const a = order.shippingAddress;
  const canCancel = ["PENDING_PAYMENT", "PAID"].includes(order.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {placed && order.status !== "CANCELLED" && (
        <Alert variant="success" title="Thank you, your order is placed" className="mb-6">
          We have saved your order. You can follow its progress on this page.
        </Alert>
      )}
      <h1 className="text-2xl font-bold text-gray-900">Order {order.id.slice(-8)}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Placed on {new Date(order.createdAt).toLocaleDateString("en-IN")}. Status:{" "}
        <Badge variant={order.status === "CANCELLED" ? "error" : order.status === "PENDING_PAYMENT" ? "warning" : "success"}>
          {STATUS_LABEL[order.status] ?? order.status}
        </Badge>
      </p>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <DeliveryTracking orderId={order.id} />
      {order.status !== "PENDING_PAYMENT" && <OrderMessaging orderId={order.id} />}

      <h2 className="mt-8 text-lg font-semibold text-gray-900">Items</h2>
      <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {order.items.map((it) => (
          <li key={it.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <span>
              {it.titleSnapshot}, quantity {it.quantity}
            </span>
            <span className="font-medium">{formatMoney(Number(it.priceSnapshot) * it.quantity, order.currency)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-right text-lg font-semibold text-teal-800">
        Total {formatMoney(order.totalAmount, order.currency)}
      </p>

      {order.sellerOrders.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-gray-900">Progress by seller</h2>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {order.sellerOrders.map((so) => (
              <li key={so.id}>
                {so.store.name}: {STATUS_LABEL[so.status] ?? so.status}
              </li>
            ))}
          </ul>
        </>
      )}

      {a && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-gray-900">Delivery address</h2>
          <p className="mt-2 text-sm text-gray-700">
            {[a.line1, a.line2, a.city, a.state, a.postalCode].filter(Boolean).join(", ")}
          </p>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {order.status === "PENDING_PAYMENT" && (
          <Button onClick={pay} loading={busy}>
            {DEMO_NOTICE.payButton}
          </Button>
        )}
        {canCancel && (
          <Button variant="danger" onClick={cancel} disabled={busy}>
            Cancel order
          </Button>
        )}
        <Link href="/orders">
          <Button variant="outline">All orders</Button>
        </Link>
        <Link href="/search">
          <Button variant="ghost">Continue shopping</Button>
        </Link>
      </div>
    </div>
  );
}
