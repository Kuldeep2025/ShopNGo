"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up to a number when it scrolls into view.
 * With reduced motion (or no observer support) the real number shows at once.
 * When the value changes later (live refresh) the new number is shown directly.
 */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);
  const [n, setN] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (played.current) {
      setN(value);
      return;
    }
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      played.current = true;
      return;
    }
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      played.current = true;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1400);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {n.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
