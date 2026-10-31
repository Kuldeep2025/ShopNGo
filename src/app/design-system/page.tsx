"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Textarea,
  FormField,
  Badge,
  Alert,
  Spinner,
  Dialog,
} from "@/components/ui";

export default function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();

  function validateEmail() {
    if (!email.includes("@")) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError(undefined);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Design System</h1>
          <p className="text-sm text-gray-500">U01 – Accessible primitives</p>
        </div>
        <Link href="/" className="text-sm text-teal-700 hover:underline">
          ← Home
        </Link>
      </div>

      <section className="mb-12 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="mb-12 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Form fields</h2>
        <FormField
          label="Email"
          required
          hint="We will never share your email"
          error={emailError}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={validateEmail}
              error={!!emailError}
              aria-describedby={describedBy}
              placeholder="you@example.com"
            />
          )}
        </FormField>
        <FormField label="Message" hint="Optional notes">
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              rows={3}
              placeholder="Write something…"
            />
          )}
        </FormField>
      </section>

      <section className="mb-12 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Badges (status + text)</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success">Approved</Badge>
          <Badge variant="warning">Under review</Badge>
          <Badge variant="error">Rejected</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>

      <section className="mb-12 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Alerts</h2>
        <Alert variant="info" title="Information">
          AI is currently disabled. Deterministic search remains available.
        </Alert>
        <Alert variant="success" title="Success">
          Your seller application was submitted.
        </Alert>
        <Alert variant="warning" title="Warning">
          Free AI quota is almost exhausted.
        </Alert>
        <Alert variant="error" title="Error">
          Unable to connect to the database. Please try again later.
        </Alert>
      </section>

      <section className="mb-12 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Spinner</h2>
        <div className="flex items-center gap-4">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" label="Loading products" />
        </div>
      </section>

      <section className="mb-12 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Dialog</h2>
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Confirm action"
          footer={
            <>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p>
            This is an accessible dialog. Focus moves inside on open, returns on
            close, and is trapped while open. Press Escape or click the backdrop
            to dismiss.
          </p>
        </Dialog>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        <h2 className="mb-2 font-semibold text-gray-800">Accessibility notes</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>All interactive elements have visible focus rings</li>
          <li>Form errors are associated via <code>aria-describedby</code> and <code>role=&quot;alert&quot;</code></li>
          <li>Dialog traps focus, restores focus on close, supports Escape</li>
          <li>Status badges always include text (never colour alone)</li>
          <li>Spinner exposes accessible name via <code>sr-only</code></li>
          <li>Respects <code>prefers-reduced-motion</code></li>
        </ul>
      </section>
    </main>
  );
}
