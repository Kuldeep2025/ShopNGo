/**
 * ShopNGo multi-theme system.
 * Extends the original light/dark switch with four curated brand themes.
 * Original behavior is preserved: default light, honours OS preference,
 * persists to localStorage under a new key that falls back to the old one.
 */

export type ThemeId = "light" | "dark" | "teal-dusk" | "sunset" | "ocean" | "forest";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  /** Whether it is a dark surface theme */
  dark: boolean;
  /** Preview swatches for the switcher UI */
  swatch: [string, string, string];
};

export const THEMES: ThemeDef[] = [
  { id: "light", label: "Light", dark: false, swatch: ["#ffffff", "#0f766e", "#f3f4f6"] },
  { id: "dark", label: "Dark", dark: true, swatch: ["#0a0a0b", "#2dd4bf", "#18181b"] },
  { id: "teal-dusk", label: "Teal Dusk", dark: true, swatch: ["#071a1c", "#2fd4c4", "#0d3b3c"] },
  { id: "sunset", label: "Sunset", dark: false, swatch: ["#fffaf5", "#c2410c", "#ffedd5"] },
  { id: "ocean", label: "Ocean", dark: false, swatch: ["#f0f9ff", "#0369a1", "#e0f2fe"] },
  { id: "forest", label: "Forest", dark: false, swatch: ["#f7faf5", "#3f6212", "#ecfccb"] },
];

export const STORAGE_KEY = "shopngo_theme_v2";
export const LEGACY_STORAGE_KEY = "shopngo_theme";

export function isThemeId(v: unknown): v is ThemeId {
  return THEMES.some((t) => t.id === v);
}

export function themeDef(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

/** Base background/foreground per theme, used by the PWA meta refresh. */
export const THEME_META: Record<ThemeId, { bg: string; fg: string; accent: string }> = {
  light: { bg: "#ffffff", fg: "#111827", accent: "#0f766e" },
  dark: { bg: "#0a0a0b", fg: "#f4f4f5", accent: "#2dd4bf" },
  "teal-dusk": { bg: "#071a1c", fg: "#e6fffb", accent: "#2fd4c4" },
  sunset: { bg: "#fffaf5", fg: "#431407", accent: "#c2410c" },
  ocean: { bg: "#f0f9ff", fg: "#082f49", accent: "#0369a1" },
  forest: { bg: "#f7faf5", fg: "#1a2e05", accent: "#3f6212" },
};
