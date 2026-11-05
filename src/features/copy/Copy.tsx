"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import type { CopyId } from "@/features/copy/variants";
import { COPY } from "@/features/copy/variants";
import { pickIndex, variantAt } from "@/features/copy/pick";

/**
 * Returns one variant of the copy for `id`.
 * The server and the first client render use variant 0 so hydration always matches;
 * after hydration a random variant is chosen once per page load.
 */
export function useVariant(id: CopyId): string {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(pickIndex((COPY[id] as readonly string[]).length));
  }, [id]);
  return variantAt(id, index);
}

/**
 * Renders a text variant. The text swaps once after hydration with a short fade
 * (no fade when the visitor prefers reduced motion). Screen readers simply read
 * whichever text is in the page.
 */
export function Copy({
  id,
  as,
  className,
}: {
  id: CopyId;
  as?: ElementType;
  className?: string;
}) {
  const Tag = (as ?? "span") as ElementType;
  const text = useVariant(id);
  const ref = useRef<HTMLElement | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: "ease-out" });
  }, [text]);

  return (
    <Tag ref={ref} className={className} aria-live="off" suppressHydrationWarning>
      {text}
    </Tag>
  );
}
