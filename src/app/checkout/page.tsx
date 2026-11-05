"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy } from "@/features/copy/Copy";
import Link from "next/link";
import { DEMO_NOTICE } from "@/features/legal/demoNotice";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Button, FormField, Input, Spinner } from "@/components/ui";
import { SignInRequired } from "@/components/feedback/SignInRequired";
import { apiCall, formatMoney } from "@/lib/client/api";
import type { QuoteResult } from "@/features/cart/quote";

type Address = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  isDefault: boolean;
};

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function CheckoutPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string>(newKey());
  const errorRef = useRef<HTMLDivElement>(null);

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  const load = useCallback(async () => {
    const [q, a] = await Promise.all([
      apiCall<{ quote?: QuoteResult }>(getIdToken, "/api/cart/quote", { method: "POST" }),
      apiCall<{ addresses?: Address[] }>(getIdToken, "/api/addresses"),
    ]);
    setQuote(q.data.quote ?? null);
    const list = a.data.addresses ?? [];
    setAddresses(list);
    setAddressId((cur) => cur || list.find((x) => x.isDefault)?.id || list[0]?.id || "");
    setLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, appUser, load]);

  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddress(true);
    setError(null);
    const res = await apiCall<{ address?: Address }>(getIdToken, "/api/addresses", {
      method: "POST",
      body: {
        line1: line1.trim(),
        line2: line2.trim() || null,
        city: city.trim(),
        state: state.trim() || null,
        postalCode: postalCode.trim(),
        country: "IN",
        isDefault: addresses.length === 0,
      },
    });
    setSavingAddress(false);
    if (!res.ok || !res.data.address) {
      fail(res.data.error ?? "Could not save the address. Please check the details.");
      return;
    }
    setAddresses((prev) => [res.data.address!, ...prev]);
    setAddressId(res.data.address.id);
    setLine1("");
    setLine2("");
    setCity("");
    setState("");
    setPostalCode("");
  }

  async function placeOrder() {
    setError(null);
    if (!addressId) {
      fail("Please add or choose a delivery address first.");
      return;
    }
    setPlacing(true);
    const created = await apiCall<{ order?: { id: string } }>(getIdToken, "/api/orders", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey.current },
      body: { addressId },
    });
    if (!created.ok || !created.data.order) {
      setPlacing(false);
      fail(created.data.error ?? "Could not place the order. Please try again.");
      return;
    }
    const orderId = created.data.order.id;
    // Demo payment: no real money is taken. If it is switched off, the order waits for payment.
    await apiCall(getIdToken, "/api/payments/mock", {
      method: "POST",
      body: { orderId, outcome: "success" },
    });
    router.push(`/orders/${orderId}?placed=1`);
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading checkout" />
      </div>
    );
  }

  if (!appUser) {
    return <SignInRequired title="Sign in to check out" message="Sign in to review your cart and place your order." />;
  }

  if (!quote || quote.lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Nothing to check out</h1>
        <p className="mt-2 text-gray-600"><Copy id="checkout.empty.body" /></p>
        <Link href="/search" className="mt-6 inline-block">
          <Button>Browse products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Checkout</h1>

      <div ref={errorRef} tabIndex={-1} className="focus:outline-none">
        {error && (
          <Alert variant="error" className="mt-6">
            {error}
          </Alert>
        )}
      </div>

      {!quote.allAvailable && (
        <Alert variant="warning" title="Some items need attention" className="mt-6">
          <ul className="list-inside list-disc">
            {quote.issues.map((i, n) => (
              <li key={n}>{i}</li>
            ))}
          </ul>
          <Link href="/cart" className="mt-2 inline-block font-medium underline">
            Fix your cart
          </Link>
        </Alert>
      )}

      <section aria-labelledby="summary-heading" className="mt-8">
        <h2 id="summary-heading" className="text-lg font-semibold text-gray-900">
          Order summary
        </h2>
        <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
          {quote.lines.map((l) => (
            <li key={l.listingId} className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">{l.title}</p>
                <p className="text-sm text-gray-500">
                  {l.storeName}, quantity {l.quantity} at {formatMoney(l.unitPrice, l.currency)}
                </p>
              </div>
              <p className="font-medium text-gray-900">{formatMoney(l.lineTotal, l.currency)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-right text-lg font-semibold text-teal-800">
          Total {formatMoney(quote.subtotal, quote.currency)}
        </p>
      </section>

      <section aria-labelledby="address-heading" className="mt-10">
        <h2 id="address-heading" className="text-lg font-semibold text-gray-900">
          Delivery address
        </h2>
        {addresses.length > 0 && (
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">Choose a delivery address</legend>
            {addresses.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 focus-within:ring-2 focus-within:ring-teal-600"
              >
                <input
                  type="radio"
                  name="address"
                  value={a.id}
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-gray-800">
                  {a.label ? <strong>{a.label}: </strong> : null}
                  {[a.line1, a.line2, a.city, a.state, a.postalCode].filter(Boolean).join(", ")}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <form onSubmit={saveAddress} className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="font-medium text-gray-900">{addresses.length ? "Add another address" : "Add a delivery address"}</h3>
          <FormField label="Address line 1" required>
            {({ id, describedBy }) => (
              <Input id={id} aria-describedby={describedBy} required autoComplete="address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} />
            )}
          </FormField>
          <FormField label="Address line 2">
            {({ id, describedBy }) => (
              <Input id={id} aria-describedby={describedBy} autoComplete="address-line2" value={line2} onChange={(e) => setLine2(e.target.value)} />
            )}
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="City" required>
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} required autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
              )}
            </FormField>
            <FormField label="State">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} autoComplete="address-level1" value={state} onChange={(e) => setState(e.target.value)} />
              )}
            </FormField>
            <FormField label="PIN code" required>
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} required inputMode="numeric" autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              )}
            </FormField>
          </div>
          <Button type="submit" variant="outline" loading={savingAddress}>
            Save address
          </Button>
        </form>
      </section>

      <section aria-labelledby="pay-heading" className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 id="pay-heading" className="text-lg font-semibold text-gray-900">
          Payment
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {DEMO_NOTICE.checkout}
        </p>
        <Button size="lg" fullWidth className="mt-5" onClick={placeOrder} loading={placing} disabled={!quote.allAvailable}>
          {placing ? "Placing your order" : `Place order, ${formatMoney(quote.subtotal, quote.currency)}`}
        </Button>
      </section>
    </div>
  );
}
