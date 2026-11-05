"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "@/features/theme/ThemeProvider";
import { THEMES, type ThemePref } from "@/features/theme/themes";

const OPTIONS: { id: ThemePref; label: string; swatch?: [string, string, string] }[] = [
  { id: "light", label: "Light", swatch: THEMES[0]!.swatch },
  { id: "dark", label: "Dark", swatch: THEMES[1]!.swatch },
  { id: "system", label: "System" },
  ...THEMES.slice(2).map((t) => ({ id: t.id as ThemePref, label: t.label, swatch: t.swatch })),
];

/**
 * Radio group named "Theme" with Light, Dark and System first.
 * Native radio buttons: arrow keys move between options, the choice applies at once.
 */
export function ThemeRadioGroup({ onChoose, name }: { onChoose?: () => void; name?: string }) {
  const { theme, setTheme } = useTheme();
  const uid = useId();
  const groupName = name ?? `theme-${uid}`;
  const labelId = `${groupName}-label`;
  return (
    <div role="radiogroup" aria-labelledby={labelId}>
      <p id={labelId} className="px-2 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-600">
        Theme
      </p>
      <div className="flex flex-col gap-0.5">
        {OPTIONS.map((o) => (
          <label
            key={o.id}
            className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:has-[:checked]:bg-teal-950 dark:has-[:checked]:text-teal-300 has-[:checked]:bg-teal-50 has-[:checked]:font-semibold has-[:checked]:text-teal-800 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-700"
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name={groupName}
                value={o.id}
                checked={theme === o.id}
                onChange={() => {
                  setTheme(o.id);
                  onChoose?.();
                }}
                className="h-4 w-4 accent-teal-700"
              />
              {o.swatch && (
                <span className="flex overflow-hidden rounded-full border border-gray-300" aria-hidden="true">
                  {o.swatch.map((c) => (
                    <span key={c} className="h-4 w-3.5" style={{ backgroundColor: c }} />
                  ))}
                </span>
              )}
              {o.label}
              {o.id === "system" && <span className="text-xs font-normal text-gray-600">(follows your device)</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg p-2 text-gray-700 transition hover:bg-teal-50 hover:text-teal-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="theme-popover"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" stroke="none" />
        </svg>
        <span className="hidden text-sm font-medium lg:inline" aria-hidden="true">Theme</span>
        <span className="sr-only">Theme: Light, Dark or System</span>
      </button>

      {open && (
        <div
          id="theme-popover"
          className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          <ThemeRadioGroup name="theme-header" onChoose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
