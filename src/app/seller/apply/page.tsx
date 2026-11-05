"use client";

import { SignInRequired } from "@/components/feedback/SignInRequired";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Button, FormField, Input, Textarea, Alert, Badge, Spinner } from "@/components/ui";

type Application = {
  id: string;
  status: string;
  businessName: string | null;
  description: string | null;
  decisionNote: string | null;
};

export default function SellerApplyPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
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
      const token = await getIdToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/seller/application", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setApplication(data.application);
          if (data.application) {
            setBusinessName(data.application.businessName ?? "");
            setDescription(data.application.description ?? "");
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [appUser, authLoading, getIdToken]);

  async function handleSubmit(action: "save_draft" | "submit") {
    setMessage(null);
    setSubmitting(true);
    const token = await getIdToken();
    if (!token) {
      setMessage({ type: "error", text: "You must be signed in." });
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/seller/application", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, businessName, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Request failed" });
        return;
      }
      setApplication(data.application);
      setMessage({
        type: "success",
        text: action === "submit" ? "Application submitted for review." : "Draft saved.",
      });
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading application" />
      </div>
    );
  }

  if (!appUser) return <SignInRequired title="Sign in required" message="You need an account to apply as a seller." />;

  const status = application?.status ?? "NONE";
  const canEdit = status === "NONE" || status === "DRAFT" || status === "REJECTED";
  const isPending = status === "SUBMITTED" || status === "UNDER_REVIEW";

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Become a Seller</h1>
      <p className="mt-1 text-sm text-gray-500">
        Apply to open a store on ShopNGo. A moderator will review your application.
      </p>

      {status !== "NONE" && (
        <div className="mt-4">
          <Badge
            variant={
              status === "APPROVED"
                ? "success"
                : status === "REJECTED" || status === "SUSPENDED"
                  ? "error"
                  : status === "SUBMITTED" || status === "UNDER_REVIEW"
                    ? "warning"
                    : "default"
            }
          >
            {status}
          </Badge>
          {application?.decisionNote && (
            <p className="mt-2 text-sm text-gray-600">
              Moderator note: {application.decisionNote}
            </p>
          )}
        </div>
      )}

      {isPending && (
        <Alert variant="info" title="Under review" className="mt-6">
          Your application is being reviewed. You will be able to manage your store
          once it is approved.
        </Alert>
      )}

      {status === "APPROVED" && (
        <Alert variant="success" title="Approved" className="mt-6">
          Your seller application was approved. Your store is active.
        </Alert>
      )}

      {canEdit && (
        <form
          className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("submit");
          }}
        >
          <FormField label="Business / store name" required>
            {({ id, describedBy }) => (
              <Input
                id={id}
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                aria-describedby={describedBy}
                placeholder="My Awesome Store"
              />
            )}
          </FormField>

          <FormField label="Description" hint="Tell customers what you sell">
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-describedby={describedBy}
                rows={4}
                placeholder="We sell…"
              />
            )}
          </FormField>

          {message && (
            <Alert variant={message.type === "success" ? "success" : "error"}>
              {message.text}
            </Alert>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              loading={submitting}
              onClick={() => handleSubmit("save_draft")}
            >
              Save draft
            </Button>
            <Button type="submit" loading={submitting}>
              Submit for review
            </Button>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        <Link href="/" className="text-teal-700 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
