"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Badge, Button, Spinner } from "@/components/ui";
import { SignInRequired } from "@/components/feedback/SignInRequired";
import { apiCall, formatMoney } from "@/lib/client/api";
import { ReportedMessages } from "@/features/messaging/ui/ReportedMessages";

type Activity = {
  needsAttention: { sellerApplications: number; listings: number; deliveryApplications: number };
  totals: {
    users: number;
    sellers: number;
    deliveryPartners: number;
    approvedListings: number;
    orders: number;
    reviews: number;
    activeDeliveries: number;
  };
  last24Hours: { orders: number; reviews: number };
  recentOrders: { id: string; status: string; totalAmount: string; currency: string; createdAt: string }[];
  recentReviews: { id: string; rating: number; title: string | null; createdAt: string; product: string }[];
  recentSellerApplications: { id: string; status: string; businessName: string | null; updatedAt: string }[];
  recentDeliveryApplications: {
    id: string;
    status: string;
    fullName: string | null;
    city: string | null;
    vehicleType: string | null;
    updatedAt: string;
  }[];
  recentAudit: { id: string; action: string; entity: string; createdAt: string }[];
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function ModeratorActivityPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isModerator = !!appUser && (appUser.roles.includes("MODERATOR") || appUser.roles.includes("ADMIN"));

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiCall<Activity>(getIdToken, "/api/moderator/activity");
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.data.error ?? "Could not load activity.");
    }
    setLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    if (authLoading || !isModerator) return;
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [authLoading, isModerator, load]);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading" />
      </div>
    );
  }
  if (!appUser) return <SignInRequired title="Sign in as a moderator" />;
  if (!isModerator) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <Alert variant="warning" title="Moderator access required">
          This page is for ShopNGo moderators and admins.
        </Alert>
      </div>
    );
  }

  const attention = data?.needsAttention;
  const cards = attention
    ? [
        { label: "Seller applications waiting", n: attention.sellerApplications, href: "/moderator/applications" },
        { label: "Listings waiting for review", n: attention.listings, href: "/moderator/listings" },
        { label: "Delivery applications waiting", n: attention.deliveryApplications, href: "/moderator/activity" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 sm:text-3xl">Control centre</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
            New requests and recent activity across ShopNGo. This page refreshes every 30 seconds.
          </p>
        </div>
        <Button variant="outline" onClick={load} loading={loading}>
          Refresh now
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      {data && (
        <>
          <section aria-labelledby="attn" className="mt-8">
            <h2 id="attn" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
              Needs your attention
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              {cards.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span className="block text-3xl font-bold text-teal-700 dark:text-teal-400">{c.n}</span>
                    <span className="mt-1 block text-sm text-gray-700 dark:text-zinc-300">{c.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="totals" className="mt-10">
            <h2 id="totals" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
              The whole site at a glance
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Members", data.totals.users],
                ["Sellers", data.totals.sellers],
                ["Delivery partners", data.totals.deliveryPartners],
                ["Live products", data.totals.approvedListings],
                ["Orders in total", data.totals.orders],
                ["Orders in last 24 hours", data.last24Hours.orders],
                ["Reviews in total", data.totals.reviews],
                ["Deliveries on the road", data.totals.activeDeliveries],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-zinc-400">{k}</dt>
                  <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-zinc-100">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="orders">
              <h2 id="orders" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                Latest orders
              </h2>
              <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {data.recentOrders.length === 0 && <li className="p-4 text-sm text-gray-500">No orders yet.</li>}
                {data.recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span>
                      <Badge variant={o.status === "DELIVERED" ? "success" : "info"}>{o.status}</Badge>{" "}
                      <span className="text-gray-500">{when(o.createdAt)}</span>
                    </span>
                    <span className="font-medium">{formatMoney(o.totalAmount, o.currency)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="reviews">
              <h2 id="reviews" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                Latest ratings
              </h2>
              <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {data.recentReviews.length === 0 && <li className="p-4 text-sm text-gray-500">No ratings yet.</li>}
                {data.recentReviews.map((r) => (
                  <li key={r.id} className="p-3 text-sm">
                    <span className="font-medium">{r.rating} out of 5 stars</span> for {r.product}
                    {r.title ? `: ${r.title}` : ""} <span className="text-gray-500">({when(r.createdAt)})</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="sellers">
              <h2 id="sellers" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                Recent seller applications
              </h2>
              <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {data.recentSellerApplications.length === 0 && <li className="p-4 text-sm text-gray-500">None yet.</li>}
                {data.recentSellerApplications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span>{a.businessName ?? "Unnamed business"}</span>
                    <Badge variant={a.status === "APPROVED" ? "success" : a.status === "REJECTED" ? "error" : "warning"}>
                      {a.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="drivers">
              <h2 id="drivers" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                Recent delivery partners
              </h2>
              <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {data.recentDeliveryApplications.length === 0 && <li className="p-4 text-sm text-gray-500">None yet.</li>}
                {data.recentDeliveryApplications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span>
                      {a.fullName ?? "Unnamed"}
                      {a.city ? `, ${a.city}` : ""}
                      {a.vehicleType ? ` (${a.vehicleType})` : ""}
                    </span>
                    <Badge variant={a.status === "APPROVED" ? "success" : a.status === "REJECTED" ? "error" : "warning"}>
                      {a.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <ReportedMessages />

          <section aria-labelledby="audit" className="mt-10">
            <h2 id="audit" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
              Recent moderator actions
            </h2>
            <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {data.recentAudit.length === 0 && <li className="p-4 text-sm text-gray-500">Nothing logged yet.</li>}
              {data.recentAudit.map((e) => (
                <li key={e.id} className="p-3 text-sm">
                  {e.action} on {e.entity} <span className="text-gray-500">({when(e.createdAt)})</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
