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
  isThemeId,
  themeDef,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  type ThemeId,
} from "./themes";

type ThemeContextValue = {
  theme: ThemeId;
  themes: typeof THEME_META;
  setTheme: (id: ThemeId) => void;
  /** Kept for backward compatibility: cycles to the next theme. */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  themes: THEME_META,
  setTheme: () => {},
  toggle: () => {},
});

function nextThemeId(current: ThemeId, prefersDark: boolean): ThemeId {
  if (current === "light") return prefersDark ? "teal-dusk" : "dark";
  if (current === "dark") return "teal-dusk";
  return "light";
}

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    let id: ThemeId;
    if (isThemeId(stored)) {
      id = stored;
    } else if (stored === "dark") {
      id = "dark";
    } else {
      id = prefersDark ? "dark" : "light";
    }
    setThemeState(id);
    applyTheme(id);
    setReady(true);
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    applyTheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const prefersDark =
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const next = nextThemeId(prev, prefersDark);
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  if (!ready) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, themes: THEME_META, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}