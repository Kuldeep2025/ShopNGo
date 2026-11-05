"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/features/about/Reveal";
import { CountUp } from "@/features/about/CountUp";
import { statTiles, type SiteStats } from "@/features/stats/tiles";

/** Number tiles that start from the server's real numbers and refresh every minute. */
export function LiveStats({ initial, extra }: { initial: SiteStats; extra: { label: string; value: number }[] }) {
  const [stats, setStats] = useState(initial);
  const [announce, setAnnounce] = useState("");
  const last = useRef(initial);

  useEffect(() => {
    let stop = false;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as SiteStats;
        if (stop || next.source !== "live") return;
        if (next.products !== last.current.products) {
          setAnnounce(`Products now ${next.products.toLocaleString("en-IN")}.`);
        }
        last.current = next;
        setStats(next);
      } catch {
        /* keep showing the last numbers */
      }
    };
    const id = window.setInterval(refresh, 60_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  const tiles = [...statTiles(stats).map((t) => ({ key: t.key, value: t.value, label: t.label })), ...extra.map((e) => ({ key: e.label, value: e.value, label: e.label }))];

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((s, i) => (
          <li key={s.key}>
            <Reveal delay={i * 100} className="h-full">
              <div className="h-full rounded-2xl border border-teal-900/10 bg-white p-5 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <p className="font-display text-4xl font-extrabold text-teal-700 dark:text-teal-300">
                  <CountUp value={s.value} />
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{s.label}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs text-gray-500 dark:text-zinc-400">
        {stats.source === "live"
          ? `These numbers are read live from the shop${stats.averageRating !== null ? `. Average customer rating ${stats.averageRating} out of 5` : ""}.`
          : "The shop database is not reachable right now, so only catalogue numbers are shown. They will return to live numbers when it is back."}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </>
  );
}
