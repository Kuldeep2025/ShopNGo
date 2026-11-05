"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/features/brand/logos";
import { LOGO_COUNT, LOGO_INTERVAL_MS, nextLogoIndex } from "@/features/brand/logoRotation";

/**
 * Header logo that crossfades to a different random design every 2 seconds.
 * - the server render and the first client render show design 0 (no mismatch)
 * - nothing rotates when the visitor prefers reduced motion
 * - rotation pauses while the tab is hidden
 * - the box has a fixed size, so nothing around it moves
 * - the whole graphic is aria-hidden; the link's name is the "ShopNGo" text
 */
export function RotatingLogo({ className = "h-9 w-9 sm:h-10 sm:w-10" }: { className?: string }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      stop();
      if (motion.matches || document.hidden) return;
      timer = setInterval(() => setActive((prev) => nextLogoIndex(prev, LOGO_COUNT)), LOGO_INTERVAL_MS);
    };

    start();
    document.addEventListener("visibilitychange", start);
    motion.addEventListener("change", start);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", start);
      motion.removeEventListener("change", start);
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      data-rotating-logo=""
      data-active={active}
      className={`relative inline-block shrink-0 ${className}`}
    >
      {Array.from({ length: LOGO_COUNT }, (_, i) => (
        <LogoMark
          key={i}
          variant={i}
          className={`absolute inset-0 h-full w-full rounded-xl shadow-md shadow-teal-800/20 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </span>
  );
}
