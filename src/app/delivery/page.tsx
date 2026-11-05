"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Badge, Button, Spinner } from "@/components/ui";
import { SignInRequired } from "@/components/feedback/SignInRequired";
import { apiCall, formatMoney } from "@/lib/client/api";
import { describeDistance, osmEmbedUrl, osmLink } from "@/features/delivery/geo";

type Available = {
  orderId: string; shortId: string; total: string; currency: string; itemCount: number;
  area: string; distanceKm: number | null; etaMinutes: number | null;
};
type Mine = {
  id: string; orderId: string; shortId: string; status: string; total: string; currency: string;
  itemCount: number; address: string; dest: { lat: number; lng: number } | null;
  distanceKm: number | null; etaMinutes: number | null;
};
type Partner = {
  isOnline: boolean; lat: number | null; lng: number | null; locationUpdatedAt: string | null;
  deliveriesDone: number; fullName: string | null; vehicleType: string | null;
};
type Jobs = { partner: Partner; available: Available[]; deliveries: Mine[] };

const STATUS_TEXT: Record<string, string> = {
  ASSIGNED: "Go to pick it up",
  PICKED_UP: "On the way to the customer",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function DeliveryDashboardPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [jobs, setJobs] = useState<Jobs | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-partner" | "error">("loading");
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>("Location sharing is off.");
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  const load = useCallback(async () => {
    const res = await apiCall<Jobs>(getIdToken, "/api/delivery/jobs");
    if (res.ok) {
      setJobs(res.data);
      setState("ready");
    } else if (res.status === 403 || res.status === 404) setState("not-partner");
    else setState("error");
  }, [getIdToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser) {
      setState("ready");
      return;
    }
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [authLoading, appUser, load]);

  const online = jobs?.partner.isOnline ?? false;

  const sendPosition = useCallback(
    async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSent.current < 8000) return;
      lastSent.current = now;
      const res = await apiCall(getIdToken, "/api/delivery/location", {
        method: "POST",
        body: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
      });
      setGeoStatus(
        res.ok
          ? `Sharing your location. Last update ${new Date().toLocaleTimeString("en-IN")}, accurate to about ${Math.round(pos.coords.accuracy)} metres.`
          : "Could not send your location. Will try again."
      );
    },
    [getIdToken]
  );

  // Share the live location only while the partner is online.
  useEffect(() => {
    if (!online) {
      if (watchId.current !== null && typeof navigator !== "undefined") navigator.geolocation?.clearWatch(watchId.current);
      watchId.current = null;
      setGeoStatus("Location sharing is off.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("This device cannot share its location.");
      return;
    }
    setGeoStatus("Asking for your location. Please allow it when your browser asks.");
    watchId.current = navigator.geolocation.watchPosition(
      sendPosition,
      (err) =>
        setGeoStatus(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked. Allow location for this site in your browser settings, then go online again."
            : "Could not find your location yet. Trying again."
        ),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [online, sendPosition]);

  async function toggleOnline() {
    setBusy("online");
    setMessage(null);
    const res = await apiCall(getIdToken, "/api/delivery/partner", { method: "PATCH", body: { isOnline: !online } });
    setBusy(null);
    if (!res.ok) setMessage({ type: "error", text: res.data.error ?? "Could not change your status." });
    else {
      setMessage({ type: "info", text: !online ? "You are online. Open orders will appear below." : "You are offline." });
      await load();
    }
  }

  async function act(orderId: string, action: "claim" | "pickup" | "deliver" | "release") {
    setBusy(orderId + action);
    setMessage(null);
    const res = await apiCall(getIdToken, `/api/delivery/jobs/${orderId}`, { method: "POST", body: { action } });
    setBusy(null);
    if (!res.ok) setMessage({ type: "error", text: res.data.error ?? "That did not work." });
    else {
      const done: Record<string, string> = {
        claim: "Order taken. Go and pick it up.",
        pickup: "Marked as picked up. Take it to the customer.",
        deliver: "Delivered. Thank you!",
        release: "Order given back.",
      };
      setMessage({ type: "success", text: done[action] });
    }
    await load();
  }

  if (authLoading || state === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading deliveries" />
      </div>
    );
  }
  if (!appUser) return <SignInRequired title="Sign in to deliver orders" />;
  if (state === "not-partner") {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Deliver with ShopNGo</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">You are not a delivery partner yet. It takes a minute to set up.</p>
        <Link href="/delivery/apply" className="mt-6 inline-block">
          <Button>Become a delivery partner</Button>
        </Link>
      </div>
    );
  }
  if (state === "error" || !jobs) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <Alert variant="error" title="Could not load deliveries">Please check your connection and try again.</Alert>
        <Button className="mt-4" onClick={load}>Try again</Button>
      </div>
    );
  }

  const active = jobs.deliveries.filter((d) => d.status === "ASSIGNED" || d.status === "PICKED_UP");
  const past = jobs.deliveries.filter((d) => d.status === "DELIVERED" || d.status === "CANCELLED");
  const here = jobs.partner.lat !== null && jobs.partner.lng !== null ? { lat: jobs.partner.lat, lng: jobs.partner.lng } : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Delivery partner</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
        {jobs.partner.fullName ?? "Partner"} · {jobs.partner.vehicleType ?? "Vehicle not set"} · {jobs.partner.deliveriesDone} delivered
      </p>

      <section aria-labelledby="status-h" className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 id="status-h" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
          You are {online ? "online" : "offline"}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400" role="status" aria-live="polite">{geoStatus}</p>
        <Button className="mt-4" variant={online ? "outline" : "primary"} loading={busy === "online"} onClick={toggleOnline}>
          {online ? "Go offline" : "Go online"}
        </Button>
        {here && (
          <p className="mt-3 text-sm">
            <a className="text-teal-700 underline dark:text-teal-400" href={osmLink(here)} target="_blank" rel="noopener noreferrer">
              See my position on the map
            </a>
          </p>
        )}
      </section>

      <div aria-live="polite" className="mt-4">
        {message && <Alert variant={message.type}>{message.text}</Alert>}
      </div>

      <section aria-labelledby="active-h" className="mt-8">
        <h2 id="active-h" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">My active deliveries ({active.length})</h2>
        {active.length === 0 && <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Nothing on the way right now.</p>}
        <ul className="mt-3 space-y-4">
          {active.map((d) => (
            <li key={d.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-gray-900 dark:text-zinc-100">Order {d.shortId}</h3>
                <Badge variant="warning">{STATUS_TEXT[d.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">
                {d.itemCount} item{d.itemCount === 1 ? "" : "s"} · {formatMoney(d.total, d.currency)}
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">Deliver to: {d.address || "Address not available"}</p>
              {d.distanceKm !== null && (
                <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">
                  About {describeDistance(d.distanceKm)} away, roughly {d.etaMinutes} minutes.
                </p>
              )}
              {d.dest && (
                <>
                  <iframe
                    title={`Map showing the delivery address for order ${d.shortId}`}
                    src={osmEmbedUrl(d.dest)}
                    loading="lazy"
                    className="mt-3 h-52 w-full rounded-lg border border-gray-200 dark:border-zinc-700"
                  />
                  <a className="mt-2 inline-block text-sm text-teal-700 underline dark:text-teal-400" href={osmLink(d.dest)} target="_blank" rel="noopener noreferrer">
                    Open delivery address in maps
                  </a>
                </>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {d.status === "ASSIGNED" && (
                  <>
                    <Button size="sm" loading={busy === d.orderId + "pickup"} onClick={() => act(d.orderId, "pickup")}>Mark picked up</Button>
                    <Button size="sm" variant="outline" loading={busy === d.orderId + "release"} onClick={() => act(d.orderId, "release")}>Give back</Button>
                  </>
                )}
                {d.status === "PICKED_UP" && (
                  <Button size="sm" loading={busy === d.orderId + "deliver"} onClick={() => act(d.orderId, "deliver")}>Mark delivered</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="open-h" className="mt-8">
        <h2 id="open-h" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Open orders ({jobs.available.length})</h2>
        {!online && <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Go online to see orders waiting for a partner.</p>}
        {online && jobs.available.length === 0 && <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">No open orders right now. This list refreshes by itself.</p>}
        <ul className="mt-3 space-y-3">
          {jobs.available.map((o) => (
            <li key={o.orderId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-zinc-100">Order {o.shortId}</p>
                <p className="text-sm text-gray-700 dark:text-zinc-300">
                  {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {formatMoney(o.total, o.currency)} · {o.area || "Area not set"}
                </p>
                {o.distanceKm !== null && <p className="text-sm text-gray-600 dark:text-zinc-400">About {describeDistance(o.distanceKm)} from you.</p>}
              </div>
              <Button size="sm" loading={busy === o.orderId + "claim"} onClick={() => act(o.orderId, "claim")}>Take this order</Button>
            </li>
          ))}
        </ul>
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past-h" className="mt-8">
          <h2 id="past-h" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Finished</h2>
          <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {past.map((d) => (
              <li key={d.id} className="flex justify-between gap-3 px-4 py-3 text-sm text-gray-700 dark:text-zinc-300">
                <span>Order {d.shortId} · {d.address}</span>
                <span>{STATUS_TEXT[d.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
