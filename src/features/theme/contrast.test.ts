import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { THEMES, THEME_META, resolveTheme, isThemePref } from "./themes";
import { themeBootScript } from "./bootScript";
import { AI_AVATARS } from "../avatars/catalog";

const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");

/** Variables of one block, e.g. [data-theme="dark"] or [data-accent="ocean"]. */
function vars(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})/g)) out[m[1]!] = m[2]!;
  return out;
}

const light = { ...vars(":root,\n[data-theme=\"light\"]") };
const blocks: Record<string, Record<string, string>> = {
  light,
  dark: vars('[data-theme="dark"]'),
  "teal-dusk": vars('[data-accent="teal-dusk"]'),
  sunset: vars('[data-accent="sunset"]'),
  ocean: vars('[data-accent="ocean"]'),
  forest: vars('[data-accent="forest"]'),
};

describe("theme tokens meet WCAG AA", () => {
  for (const [name, v] of Object.entries(blocks)) {
    const base = name === "dark" ? { ...light, ...v } : { ...light, ...v };
    it(`${name}: text on background and card is at least 4.5:1`, () => {
      expect(contrastRatio(base.fg!, base.bg!)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(base.fg!, base.card!)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(base.muted!, base.bg!)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(base.muted!, base.card!)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: focus ring is at least 3:1 against the background`, () => {
      expect(contrastRatio(base.ring!, base.bg!)).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("utility colour pairs (as remapped in globals.css)", () => {
  // [text, background, label]
  const lightPairs: [string, string, string][] = [
    ["#4b5563", "#ffffff", "gray-400/500 text on white"],
    ["#4b5563", "#f9fafb", "gray-400/500 text on gray-50"],
    ["#4b5563", "#f3f4f6", "gray-500 text on gray-100"],
    ["#4b5563", "#f0fdfa", "gray text on teal-50"],
    ["#6b7280", "#ffffff", "placeholder on white"],
    ["#0f766e", "#ffffff", "teal-600 text on white"],
    ["#0f766e", "#f0fdfa", "teal text on teal-50"],
    ["#115e59", "#f0fdfa", "teal-800 on teal-50"],
    ["#ffffff", "#0f766e", "white on teal-600/700 button"],
    ["#ffffff", "#115e59", "white on teal-800 button"],
    ["#ffffff", "#b91c1c", "white on red-700 button"],
    ["#111827", "#ffffff", "gray-900 on white"],
    ["#374151", "#ffffff", "gray-700 on white"],
    ["#991b1b", "#fef2f2", "red-800 on red-50"],
    ["#92400e", "#fffbeb", "amber-800 on amber-50"],
    ["#065f46", "#ecfdf5", "emerald-800 on emerald-50"],
    ["#1e40af", "#eff6ff", "blue-800 on blue-50"],
  ];
  const darkPairs: [string, string, string][] = [
    ["#f4f4f5", "#18181b", "gray-900 text on card"],
    ["#e4e4e7", "#18181b", "gray-700/800 text on card"],
    ["#a1a1aa", "#18181b", "gray-500/600 text on card"],
    ["#a1a1aa", "#0f0f10", "gray-500 text on gray-50"],
    ["#a1a1aa", "#27272a", "gray-500 text on gray-100"],
    ["#a1a1aa", "#0a0a0b", "placeholder on page"],
    ["#5eead4", "#18181b", "teal text on card"],
    ["#5eead4", "#134e4a", "teal text on teal-50"],
    ["#5eead4", "#0a0a0b", "teal text on page"],
    ["#fca5a5", "#450a0a", "red text on red-50"],
    ["#fcd34d", "#451a03", "amber text on amber-50"],
    ["#fcd34d", "#78350f", "amber text on amber-100"],
    ["#6ee7b7", "#022c22", "emerald text on emerald-50"],
    ["#93c5fd", "#172554", "blue text on blue-50"],
    ["#ffffff", "#0f766e", "white on teal button"],
  ];
  for (const [fg, bg, label] of lightPairs) {
    it(`light: ${label}`, () => expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5));
  }
  for (const [fg, bg, label] of darkPairs) {
    it(`dark: ${label}`, () => expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5));
  }
  it("globals.css really contains the remapped values used above", () => {
    for (const v of ["#4b5563", "#0f766e", "#a1a1aa", "#5eead4", "#fca5a5", "#fcd34d", "#6ee7b7", "#93c5fd"]) {
      expect(css).toContain(v);
    }
  });
});

describe("AI avatars", () => {
  it("every avatar has white glyphs readable on its colour (3:1 for graphics)", () => {
    for (const a of AI_AVATARS) expect(contrastRatio("#ffffff", a.bg)).toBeGreaterThanOrEqual(4.5);
  });
  it("has eight avatars with names", () => {
    expect(AI_AVATARS).toHaveLength(8);
    for (const a of AI_AVATARS) expect(a.name.length).toBeGreaterThan(2);
  });
});

describe("theme resolution", () => {
  it("System follows the device", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
  it("explicit choices win over the device", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("unknown values fall back to System", () => {
    expect(resolveTheme("nonsense", true)).toBe("dark");
    expect(isThemePref("system")).toBe(true);
    expect(isThemePref("x")).toBe(false);
  });
  it("every theme has meta colours", () => {
    for (const t of THEMES) expect(THEME_META[t.id].bg).toMatch(/^#/);
  });
});

describe("boot script", () => {
  const script = themeBootScript();
  it("is valid JavaScript and sets theme before paint", () => {
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain("dataset.theme");
    expect(script).toContain("theme-color");
    expect(script).toContain("prefers-color-scheme");
  });
  it("applies stored dark and system+dark device", () => {
    const run = (stored: string | null, prefersDark: boolean) => {
      const attrs: Record<string, string> = {};
      const metas: { content: string; setAttribute: (k: string, v: string) => void }[] = [
        { content: "", setAttribute(_k, v) { this.content = v; } },
      ];
      const root = { dataset: attrs, style: { colorScheme: "", setProperty() {} } };
      const win = { matchMedia: () => ({ matches: prefersDark }) };
      const doc = {
        documentElement: root,
        querySelectorAll: () => metas,
        createElement: () => ({}),
        head: { appendChild() {} },
      };
      const ls = { getItem: () => stored };
      new Function("window", "document", "localStorage", script)(win, doc, ls);
      return { theme: attrs.theme, meta: metas[0]!.content };
    };
    expect(run("dark", false).theme).toBe("dark");
    expect(run("light", true).theme).toBe("light");
    expect(run("system", true).theme).toBe("dark");
    expect(run(null, false).theme).toBe("light");
    expect(run("dark", false).meta).toBe(THEME_META.dark.bg);
  });
});
