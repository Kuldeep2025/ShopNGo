"use client";

import { useEffect, useState } from "react";
import { pickTagline, taglineClass, type Tagline } from "@/features/brand/taglines";

/**
 * Rotating headline tagline. Picks a fresh tagline/quote on every mount,
 * so every load or refresh shows a different one.
 */
export function RotatingTagline({ className = "" }: { className?: string }) {
  const [tagline, setTagline] = useState<Tagline | null>(null);

  useEffect(() => {
    setTagline(pickTagline());
  }, []);

  if (!tagline) {
    return <span className={`inline-block h-5 w-64 animate-pulse rounded bg-white/20 ${className}`} />;
  }

  return (
    <span
      className={`inline-block ${taglineClass(tagline.kind)} ${className}`}
    >
      {tagline.text}
    </span>
  );
}