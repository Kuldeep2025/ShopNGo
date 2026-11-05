"use client";

import { useEffect, useState } from "react";

/**
 * Shows the current year. The server HTML carries the year of the last render
 * or build; once the page loads in the browser it is replaced by the visitor's
 * current year, so it stays correct without a redeploy.
 */
export function CopyrightYear({ initialYear }: { initialYear: number }) {
  const [year, setYear] = useState(initialYear);
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  return <span suppressHydrationWarning>{year}</span>;
}
