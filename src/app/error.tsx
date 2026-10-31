"use client";

import { useEffect } from "react";
import { Button, Alert } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for diagnostics – never log secrets
    console.error("App error:", error.message);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Alert variant="error" title="Something went wrong">
        An unexpected error occurred. You can try again or return home.
      </Alert>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.assign("/")}>
          Back to home
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-gray-400">Reference: {error.digest}</p>
      )}
    </div>
  );
}
