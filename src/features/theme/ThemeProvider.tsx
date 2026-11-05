"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  THEME_META,
  isThemePref,
  resolveTheme,
  themeDef,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  type ThemeId,
  type ThemePref,
} from "./themes";

type ThemeContextValue = {
  /** The choice: a theme id or "system". */
  theme: ThemePref;
  /** The theme actually shown right now. */
  resolved: ThemeId;
  themes: typeof THEME_META;
  setTheme: (id: ThemePref) => void;
  /** Kept for backward compatibility: cycles to the next theme. */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "light",
  themes: THEME_META,
  setTheme: () => {},
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(id: ThemeId) {
  const meta = THEME_META[id];
  const root = document.documentElement;
  // data-theme still drives light/dark surface helpers; accent + extra
  // variables come from data-accent so all six themes feel distinct.
  root.dataset.theme = themeDef(id).dark ? "dark" : "light";
  root.dataset.accent = id;
  root.style.colorScheme = themeDef(id).dark ? "dark" : "light";
  root.style.setProperty("--accent", meta.accent);
  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement("meta");
    themeMeta.setAttribute("name", "theme-color");
    document.head.appendChild(themeMeta);
  }
  themeMeta.setAttribute("content", meta.bg);
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<ThemeId>("light");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const pref: ThemePref = isThemePref(stored) ? stored : "system";
    const id = resolveTheme(pref, systemPrefersDark());
    setThemeState(pref);
    setResolved(id);
    applyTheme(id);
  }, []);

  // While on System, follow the device setting live.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const id = resolveTheme("system", mq.matches);
      setResolved(id);
      applyTheme(id);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((pref: ThemePref) => {
    const id = resolveTheme(pref, systemPrefersDark());
    setThemeState(pref);
    setResolved(id);
    applyTheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, themes: THEME_META, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
