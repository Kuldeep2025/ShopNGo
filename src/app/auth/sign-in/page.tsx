"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, FormField, Input, Alert } from "@/components/ui";
import { isFirebaseConfigured } from "@/lib/env";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured =
    typeof window !== "undefined" ? isFirebaseConfigured() : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!configured) {
      setError(
        "Sign-in is not set up on this demo yet. You can still browse products and categories."
      );
      setLoading(false);
      return;
    }

    try {
      const auth = await import("@/lib/auth/firebase-client");
      if (mode === "signin") {
        await auth.signInWithEmail(email, password);
      } else {
        await auth.signUpWithEmail(email, password);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      if (
        message.includes("auth/invalid-credential") ||
        message.includes("auth/wrong-password")
      ) {
        setError("Invalid email or password.");
      } else if (message.includes("auth/email-already-in-use")) {
        setError("An account with this email already exists. Try signing in.");
      } else if (message.includes("auth/weak-password")) {
        setError("Password should be at least 6 characters.");
      } else if (message.includes("auth/invalid-email")) {
        setError("Please enter a valid email address.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {mode === "signin"
            ? "Sign in to manage orders, addresses, and your cart."
            : "Join ShopNGo to shop, save addresses, and track orders."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
      >
        {mode === "signup" && (
          <FormField label="Display name" hint="Optional">
            {({ id, describedBy }) => (
              <Input
                id={id}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                aria-describedby={describedBy}
                placeholder="Your name"
                autoComplete="name"
              />
            )}
          </FormField>
        )}

        <FormField label="Email" required>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={describedBy}
              placeholder="you@example.com"
              autoComplete="email"
            />
          )}
        </FormField>

        <FormField label="Password" required hint="At least 6 characters">
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={describedBy}
              placeholder="••••••••"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
          )}
        </FormField>

        {error && (
          <Alert variant="error" title="Could not continue">
            {error}
          </Alert>
        )}

        <Button type="submit" fullWidth loading={loading} size="lg">
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>

        <p className="text-center text-sm text-gray-600">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                type="button"
                className="font-medium text-teal-700 hover:underline"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-teal-700 hover:underline"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-gray-500">
        <Link href="/" className="text-teal-700 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
