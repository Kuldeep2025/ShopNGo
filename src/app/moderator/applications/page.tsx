"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Button, Alert, Badge, Spinner, FormField, Textarea } from "@/components/ui";

type AppRow = {
  id: string;
  status: string;
  businessName: string | null;
  description: string | null;
  createdAt: string;
  user: { id: string; email: string; displayName: string | null };
};

export default function ModeratorApplicationsPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const isModerator =
    appUser?.roles.includes("MODERATOR") || appUser?.roles.includes("ADMIN");

  async function load() {
    const token = await getIdToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/moderator/applications?status=SUBMITTED", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setError("Forbidden – moderator role required");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Failed to load applications");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setApps(data.applications ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, appUser]);

  async function decide(applicationId: string, decision: "APPROVED" | "REJECTED") {
    const token = await getIdToken();
    if (!token) return;
    const r = reason[applicationId]?.trim();
    if (!r || r.length < 3) {
      setError("A decision reason (min 3 characters) is required");
      return;
    }
    setActing(applicationId);
    setError(null);
    try {
      const res = await fetch("/api/moderator/applications", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applicationId, decision, reason: r }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Decision failed");
        return;
      }
      // Remove from list
      setApps((prev) => prev.filter((a) => a.id !== applicationId));
    } catch {
      setError("Network error");
    } finally {
      setActing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading applications" />
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <Alert variant="info" title="Sign in required">
          Moderator access requires a signed-in account with the MODERATOR role.
        </Alert>
        <div className="mt-6">
          <Link href="/auth/sign-in">
            <Button>Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isModerator) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <Alert variant="warning" title="Access denied">
          You do not have the MODERATOR role. Roles cannot be self-assigned.
        </Alert>
        <div className="mt-6">
          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Seller applications</h1>
      <p className="mt-1 text-sm text-gray-500">
        Review and approve or reject pending seller applications. A reason is required.
      </p>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {apps.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">No pending applications.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {apps.map((app) => (
            <li
              key={app.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {app.businessName ?? "Untitled"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {app.user.displayName || app.user.email}
                  </p>
                  {app.description && (
                    <p className="mt-2 text-sm text-gray-700">{app.description}</p>
                  )}
                  <Badge variant="warning" className="mt-2">
                    {app.status}
                  </Badge>
                </div>
              </div>

              <div className="mt-4">
                <FormField label="Decision reason" required>
                  {({ id }) => (
                    <Textarea
                      id={id}
                      rows={2}
                      value={reason[app.id] ?? ""}
                      onChange={(e) =>
                        setReason((prev) => ({ ...prev, [app.id]: e.target.value }))
                      }
                      placeholder="Explain the decision…"
                    />
                  )}
                </FormField>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={acting === app.id}
                  onClick={() => decide(app.id, "APPROVED")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={acting === app.id}
                  onClick={() => decide(app.id, "REJECTED")}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-sm text-gray-500">
        <Link href="/" className="text-teal-700 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
