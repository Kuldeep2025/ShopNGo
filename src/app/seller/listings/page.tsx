"use client";

import { useEffect, useState } from "react";
import { Copy } from "@/features/copy/Copy";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import {
  Button,
  FormField,
  Input,
  Textarea,
  Alert,
  Badge,
  Spinner,
} from "@/components/ui";
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from "@/features/catalogue/types";
import { PricingPolicyFields, emptyPricingPolicy, bodyFromState, stateFromListing, type PricingPolicyState } from "@/features/pricing/PricingPolicyFields";
import { computeEffectivePrice } from "@/features/pricing/effectivePrice";

type Listing = {
  id: string;
  title: string;
  status: string;
  productType: string;
  price: string;
  currency: string;
  stock: number | null;
  mrp?: string | null;
  saleEnabled?: boolean | null;
  salePrice?: string | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  returnDays?: number | null;
  warrantyMonths?: number | null;
  guaranteeText?: string | null;
  replacementPolicy?: string | null;
};

export default function SellerListingsPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState<string>("PHYSICAL");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [pp, setPp] = useState<PricingPolicyState>(emptyPricingPolicy());
  const [editing, setEditing] = useState<string | null>(null);
  const [editPp, setEditPp] = useState<PricingPolicyState>(emptyPricingPolicy());
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const isSeller =
    appUser?.roles.includes("SELLER") || appUser?.roles.includes("ADMIN");

  async function load() {
    const token = await getIdToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/seller/listings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setError("Seller role required");
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, appUser]);

  async function handleCreate(submit: boolean) {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const token = await getIdToken();
    if (!token) {
      setError("Not signed in");
      setSubmitting(false);
      return;
    }
    try {
      const body: Record<string, unknown> = {
        title,
        description,
        productType,
        price,
        currency: "INR",
        submit,
        ...bodyFromState(pp),
      };
      if (productType === "PHYSICAL") {
        body.stock = Number(stock) || 0;
      }
      const res = await fetch("/api/seller/listings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create listing");
        return;
      }
      setMessage(submit ? "Listing submitted for review" : "Draft saved");
      setShowForm(false);
      setTitle("");
      setDescription("");
      setPrice("");
      setStock("0");
      setPp(emptyPricingPolicy());
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(l: Listing) {
    setEditing(l.id);
    setEditPp(stateFromListing(l));
    setEditPrice(l.price);
    setError(null);
    setMessage(null);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    setMessage(null);
    const token = await getIdToken();
    try {
      const res = await fetch(`/api/seller/listings/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ price: editPrice, ...bodyFromState(editPp) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save the changes.");
        return;
      }
      setMessage("Pricing and policy saved. Changes to the price of an approved product may need a quick review first.");
      setEditing(null);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading listings" />
      </div>
    );
  }

  if (!appUser || !isSeller) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <Alert variant="warning" title="Seller access required">
          You need an approved seller account to manage listings.
        </Alert>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/seller/apply">
            <Button>Apply as Seller</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="text-sm text-gray-500">Create and manage your products</p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller/inbox"><Button size="sm" variant="outline">Inbox</Button></Link>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New listing"}
          </Button>
        </div>
      </div>

      {message && (
        <Alert variant="success" className="mt-4">
          {message}
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {showForm && (
        <form
          className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate(true);
          }}
        >
          <FormField label="Title" required>
            {({ id }) => (
              <Input
                id={id}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product title"
              />
            )}
          </FormField>

          <FormField label="Product type" required>
            {({ id }) => (
              <select
                id={id}
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PRODUCT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField label="Price (INR)" required>
            {({ id }) => (
              <Input
                id={id}
                required
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            )}
          </FormField>

          {productType === "PHYSICAL" && (
            <FormField label="Stock" required>
              {({ id }) => (
                <Input
                  id={id}
                  required
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              )}
            </FormField>
          )}

          <PricingPolicyFields value={pp} onChange={setPp} price={price} />

          <FormField label="Description">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product…"
              />
            )}
          </FormField>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              loading={submitting}
              onClick={() => handleCreate(false)}
            >
              Save draft
            </Button>
            <Button type="submit" loading={submitting}>
              Submit for review
            </Button>
          </div>
        </form>
      )}

      <ul className="mt-8 space-y-3">
        {listings.length === 0 && (
          <p className="text-sm text-gray-500"><Copy id="seller.listings.empty" /></p>
        )}
        {listings.map((l) => {
          const eff = computeEffectivePrice(l);
          return (
            <li key={l.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{l.title}</p>
                  <p className="text-sm text-gray-500">
                    {PRODUCT_TYPE_LABELS[l.productType as keyof typeof PRODUCT_TYPE_LABELS] ?? l.productType} · {l.currency} {eff.unitPrice}
                    {eff.strikePrice && eff.percentOff > 0 && ` (${eff.percentOff}% off, was ${eff.strikePrice})`}
                    {eff.onSale ? " · Sale is on now" : eff.saleUpcoming ? " · Sale starts later" : ""}
                    {l.stock !== null && ` · Stock ${l.stock}`}
                  </p>
                </div>
                <Badge
                  variant={
                    l.status === "APPROVED"
                      ? "success"
                      : l.status === "REJECTED" || l.status === "SUSPENDED"
                        ? "error"
                        : l.status === "SUBMITTED" || l.status === "UNDER_REVIEW"
                          ? "warning"
                          : "default"
                  }
                >
                  {l.status}
                </Badge>
              </div>
              <div className="mt-3">
                <Button size="sm" variant="outline" aria-expanded={editing === l.id} onClick={() => (editing === l.id ? setEditing(null) : startEdit(l))}>
                  {editing === l.id ? "Close pricing and policy" : `Edit pricing and policy for ${l.title}`}
                </Button>
              </div>
              {editing === l.id && (
                <div className="mt-4 space-y-4">
                  <FormField label="Selling price (INR)" required>
                    {({ id }) => <Input id={id} type="number" min="0" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />}
                  </FormField>
                  <PricingPolicyFields value={editPp} onChange={setEditPp} price={editPrice} />
                  <Button loading={saving} onClick={() => saveEdit(l.id)}>Save pricing and policy</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-center text-sm text-gray-500">
        <Link href="/" className="text-teal-700 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
