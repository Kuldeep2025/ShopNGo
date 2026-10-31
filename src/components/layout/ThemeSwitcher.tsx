"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/features/theme/ThemeProvider";
import { THEMES } from "@/features/theme/themes";

export function ThemeSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg p-2 text-gray-600 transition hover:bg-teal-50 hover:text-teal-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="Change theme"
        aria-expanded={open}
        title="Change theme"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" stroke="none" />
        </svg>
        <span className="hidden text-sm font-medium lg:inline">Theme</span>
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          role="menu"
          aria-label="Theme options"
        >
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
            Appearance
          </p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === t.id}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
                onNavigate?.();
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition hover:bg-teal-50 dark:hover:bg-zinc-800 ${
                theme === t.id
                  ? "font-semibold text-teal-800 dark:text-teal-300"
                  : "text-gray-700 dark:text-zinc-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="flex overflow-hidden rounded-full border border-gray-200 dark:border-zinc-600">
                  {t.swatch.map((c) => (
                    <span key={c} className="h-4 w-3.5" style={{ backgroundColor: c }} />
                  ))}
                </span>
                {t.label}
              </span>
              {theme === t.id && (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}