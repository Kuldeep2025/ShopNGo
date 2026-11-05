"use client";

import { normaliseIndianPhone } from "@/features/delivery/phone";
import { useEffect, useState } from "react";
import { Copy } from "@/features/copy/Copy";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Button, FormField, Input, Alert, Badge, Spinner } from "@/components/ui";
import { SignInRequired } from "@/components/feedback/SignInRequired";
import { apiCall } from "@/lib/client/api";

type Application = {
  status: string;
  fullName: string | null;
  phone: string | null;
  city: string | null;
  vehicleType: string | null;
  licenseNo: string | null;
  decisionNote: string | null;
};

const VEHICLES = ["Bicycle", "Motorcycle", "Scooter", "Car", "On foot"];

export default function DeliveryApplyPage() {
  const { appUser, loading: authLoading, getIdToken, refreshAppUser } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [vehicleType, setVehicleType] = useState("Motorcycle");
  const [licenseNo, setLicenseNo] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await apiCall<{ application?: Application | null }>(getIdToken, "/api/delivery/application");
      const a = res.data.application;
      if (res.ok && a) {
        setApplication(a);
        setFullName(a.fullName ?? "");
        setPhone(a.phone ?? "");
        setCity(a.city ?? "");
        setVehicleType(a.vehicleType ?? "Motorcycle");
        setLicenseNo(a.licenseNo ?? "");
      } else if (!fullName) {
        setFullName(appUser.displayName ?? "");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser, authLoading, getIdToken]);

  async function submit(action: "save_draft" | "submit") {
    setMessage(null);
    if (action === "submit" && !normaliseIndianPhone(phone)) {
      setMessage({ type: "error", text: "Please enter a valid 10-digit Indian mobile number, for example 98765 43210." });
      return;
    }
    setSubmitting(true);
    const res = await apiCall<{ application?: Application }>(getIdToken, "/api/delivery/application", {
      method: "POST",
      body: { action, fullName, phone, city, vehicleType, licenseNo: licenseNo || undefined },
    });
    setSubmitting(false);
    if (!res.ok) {
      setMessage({ type: "error", text: res.data.error ?? "Could not send your application." });
      return;
    }
    if (res.data.application) setApplication(res.data.application);
    if (res.data.application?.status === "APPROVED") await refreshAppUser();
    setMessage({
      type: "success",
      text:
        res.data.application?.status === "APPROVED"
          ? "You are now a delivery partner. Open your delivery page to go online."
          : action === "submit"
            ? "Application sent. A moderator will review it."
            : "Draft saved.",
    });
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading" />
      </div>
    );
  }
  if (!appUser) return <SignInRequired title="Sign in to become a delivery partner" />;

  const status = application?.status ?? "NONE";
  const approved = status === "APPROVED";
  const pending = status === "SUBMITTED" || status === "UNDER_REVIEW";
  const canEdit = !approved && !pending && status !== "SUSPENDED";

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Become a delivery partner</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
        <Copy id="delivery.apply.intro" />
      </p>

      {status !== "NONE" && (
        <p className="mt-4 text-sm">
          Status:{" "}
          <Badge variant={approved ? "success" : status === "REJECTED" || status === "SUSPENDED" ? "error" : "warning"}>
            {status}
          </Badge>
          {application?.decisionNote && <span className="ml-2 text-gray-600">{application.decisionNote}</span>}
        </p>
      )}

      {approved && (
        <Alert variant="success" title="You are a delivery partner" className="mt-6">
          <Link href="/delivery" className="font-medium underline">
            Open your delivery page
          </Link>{" "}
          to go online and pick up orders.
        </Alert>
      )}
      {pending && (
        <Alert variant="info" title="Under review" className="mt-6">
          <Copy id="delivery.apply.pending" />
        </Alert>
      )}

      {canEdit && (
        <form
          className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          onSubmit={(e) => {
            e.preventDefault();
            submit("submit");
          }}
        >
          <FormField label="Full name" required>
            {({ id, describedBy }) => (
              <Input id={id} required value={fullName} onChange={(e) => setFullName(e.target.value)} aria-describedby={describedBy} autoComplete="name" />
            )}
          </FormField>
          <FormField label="Phone number" required hint="A 10-digit Indian mobile number. While you are delivering an order, the customer can see your name and this number to call you, and not after.">
            {({ id, describedBy }) => (
              <Input id={id} required inputMode="tel" type="tel" maxLength={16} value={phone} onChange={(e) => setPhone(e.target.value)} aria-describedby={describedBy} autoComplete="tel" placeholder="+91 98765 43210" />
            )}
          </FormField>
          <FormField label="City you will deliver in" required>
            {({ id, describedBy }) => (
              <Input id={id} required value={city} onChange={(e) => setCity(e.target.value)} aria-describedby={describedBy} placeholder="Chandigarh" />
            )}
          </FormField>
          <FormField label="Vehicle" required>
            {({ id, describedBy }) => (
              <select
                id={id}
                aria-describedby={describedBy}
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {VEHICLES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label="Driving licence number" hint="Optional for bicycle or on foot">
            {({ id, describedBy }) => (
              <Input id={id} value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} aria-describedby={describedBy} />
            )}
          </FormField>

          {message && <Alert variant={message.type === "success" ? "success" : "error"}>{message.text}</Alert>}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" loading={submitting} onClick={() => submit("save_draft")}>
              Save draft
            </Button>
            <Button type="submit" loading={submitting}>
              Become a delivery partner
            </Button>
          </div>
        </form>
      )}
      {!canEdit && message && <Alert variant={message.type === "success" ? "success" : "error"} className="mt-4">{message.text}</Alert>}
    </div>
  );
}
