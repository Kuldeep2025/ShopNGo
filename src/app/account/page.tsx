"use client";

import { SignInRequired } from "@/components/feedback/SignInRequired";
import { useEffect, useState } from "react";
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

type Address = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export default function AccountPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

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
      try {
        const [profileRes, addrRes] = await Promise.all([
          fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/addresses", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          const p = data.profile;
          setDisplayName(p?.displayName ?? appUser.displayName ?? "");
          setPhone(p?.profile?.phone ?? "");
          setBio(p?.profile?.bio ?? "");
        }
        if (addrRes.ok) {
          const data = await addrRes.json();
          setAddresses(data.addresses ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [appUser, authLoading, getIdToken]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const token = await getIdToken();
    if (!token) {
      setError("Not signed in");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName, phone, bio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      setMessage("Profile updated");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const token = await getIdToken();
    if (!token) {
      setError("Not signed in");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: addrLabel || null,
          line1,
          line2: line2 || null,
          city,
          state: state || null,
          postalCode,
          country: "IN",
          isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add address");
        return;
      }
      setAddresses((prev) => [data.address, ...prev]);
      setShowAddressForm(false);
      setAddrLabel("");
      setLine1("");
      setLine2("");
      setCity("");
      setState("");
      setPostalCode("");
      setIsDefault(false);
      setMessage("Address added");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddress(id: string) {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`/api/addresses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      setMessage("Address removed");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading account" />
      </div>
    );
  }

  if (!appUser) return <SignInRequired title="Sign in required" message="Sign in to manage your profile and addresses." />;

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
      <p className="mt-1 text-sm text-gray-500">{appUser.email}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {appUser.roles.map((r) => (
          <Badge key={r} variant="brand">
            {r}
          </Badge>
        ))}
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

      {/* Profile form */}
      <form
        onSubmit={saveProfile}
        className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="font-semibold text-gray-900">Profile</h2>
        <FormField label="Display name">
          {({ id }) => (
            <Input
              id={id}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          )}
        </FormField>
        <FormField label="Phone" hint="Optional">
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-describedby={describedBy}
              placeholder="+91 …"
              autoComplete="tel"
            />
          )}
        </FormField>
        <FormField label="Bio" hint="Optional, max 500 characters">
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              aria-describedby={describedBy}
              placeholder="A short bio…"
            />
          )}
        </FormField>
        <Button type="submit" loading={saving}>
          Save profile
        </Button>
      </form>

      {/* Addresses */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Addresses</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddressForm((v) => !v)}>
            {showAddressForm ? "Cancel" : "Add address"}
          </Button>
        </div>

        {showAddressForm && (
          <form
            onSubmit={addAddress}
            className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <FormField label="Label" hint="e.g. Home, Work">
              {({ id }) => (
                <Input id={id} value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} />
              )}
            </FormField>
            <FormField label="Address line 1" required>
              {({ id }) => (
                <Input id={id} required value={line1} onChange={(e) => setLine1(e.target.value)} />
              )}
            </FormField>
            <FormField label="Address line 2">
              {({ id }) => (
                <Input id={id} value={line2} onChange={(e) => setLine2(e.target.value)} />
              )}
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="City" required>
                {({ id }) => (
                  <Input id={id} required value={city} onChange={(e) => setCity(e.target.value)} />
                )}
              </FormField>
              <FormField label="State">
                {({ id }) => (
                  <Input id={id} value={state} onChange={(e) => setState(e.target.value)} />
                )}
              </FormField>
            </div>
            <FormField label="Postal code" required>
              {({ id }) => (
                <Input
                  id={id}
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              )}
            </FormField>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300 text-teal-700 focus:ring-teal-600"
              />
              Set as default address
            </label>
            <p className="text-xs text-gray-400">
              Location coordinates are optional and only stored if you later enable the location
              feature with consent. No continuous GPS is used.
            </p>
            <Button type="submit" loading={saving}>
              Save address
            </Button>
          </form>
        )}

        <ul className="mt-4 space-y-3">
          {addresses.length === 0 && (
            <p className="text-sm text-gray-500">No addresses saved yet.</p>
          )}
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="text-sm">
                {a.label && (
                  <p className="font-medium text-gray-900">
                    {a.label}{" "}
                    {a.isDefault && (
                      <Badge variant="brand" className="ml-1 text-[10px]">
                        Default
                      </Badge>
                    )}
                  </p>
                )}
                <p className="text-gray-700">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                </p>
                <p className="text-gray-500">
                  {a.city}
                  {a.state ? `, ${a.state}` : ""} {a.postalCode}
                </p>
                <p className="text-gray-400">{a.country}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteAddress(a.id)}
                aria-label={`Delete address ${a.label || a.line1}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-center text-sm text-gray-500">
        <Link href="/" className="text-teal-700 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
