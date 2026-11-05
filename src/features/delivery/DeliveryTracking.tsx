"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/identity/AuthProvider";
import { Badge } from "@/components/ui";
import { apiCall } from "@/lib/client/api";
import { describeDistance, osmEmbedUrl, osmLink } from "./geo";

type Tracking = {
  status: string;
  partnerFirstName: string;
  vehicleType: string | null;
  partnerPosition: { lat: number; lng: number } | null;
  positionUpdatedAt: string | null;
  destination: { lat: number; lng: number } | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  deliveredAt: string | null;
};

const SUMMARY: Record<string, string> = {
  ASSIGNED: "has accepted your order and is heading to pick it up",
  PICKED_UP: "has picked up your order and is on the way",
  DELIVERED: "delivered your order",
  CANCELLED: "is no longer delivering your order",
};

/** Live delivery status and map for the customer. Refreshes every 10 seconds while active. */
export function DeliveryTracking({ orderId }: { orderId: string }) {
  const { getIdToken } = useAuth();
  const [t, setT] = useState<Tracking | null>(null);

  const load = useCallback(async () => {
    const res = await apiCall<{ tracking: Tracking | null }>(getIdToken, `/api/orders/${orderId}/tracking`);
    if (res.ok) setT(res.data.tracking);
  }, [getIdToken, orderId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  if (!t) return null;
  const active = t.status === "ASSIGNED" || t.status === "PICKED_UP";
  const focus = t.partnerPosition ?? t.destination;

  return (
    <section aria-labelledby="track-h" className="mt-8">
      <h2 id="track-h" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Delivery</h2>
      <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-gray-800 dark:text-zinc-200" role="status" aria-live="polite">
          <Badge variant={t.status === "DELIVERED" ? "success" : "warning"}>{t.status.replace("_", " ")}</Badge>{" "}
          {t.partnerFirstName}
          {t.vehicleType ? ` (${t.vehicleType.toLowerCase()})` : ""} {SUMMARY[t.status] ?? ""}.
        </p>
        {active && t.distanceKm !== null && (
          <p className="mt-2 text-sm text-gray-800 dark:text-zinc-200">
            About {describeDistance(t.distanceKm)} from you, arriving in roughly {t.etaMinutes} minutes.
          </p>
        )}
        {active && !t.partnerPosition && (
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Waiting for the partner&apos;s location.</p>
        )}
        {active && t.positionUpdatedAt && (
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
            Location updated {new Date(t.positionUpdatedAt).toLocaleTimeString("en-IN")}.
          </p>
        )}
        {active && focus && (
          <>
            <iframe
              title="Map showing where your delivery partner is"
              src={osmEmbedUrl(focus)}
              loading="lazy"
              className="mt-3 h-60 w-full rounded-lg border border-gray-200 dark:border-zinc-700"
            />
            <a className="mt-2 inline-block text-sm text-teal-700 underline dark:text-teal-400" href={osmLink(focus)} target="_blank" rel="noopener noreferrer">
              Open in maps
            </a>
          </>
        )}
        {t.status === "DELIVERED" && t.deliveredAt && (
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Delivered on {new Date(t.deliveredAt).toLocaleString("en-IN")}.</p>
        )}
      </div>
    </section>
  );
}
