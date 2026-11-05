import { describe, expect, it } from "vitest";
import {
  DISMISSED_KEY,
  MAX_REMEMBERED,
  addDismissed,
  areAllHidden,
  clampIndex,
  isDismissed,
  nextIndex,
  prevIndex,
  readDismissed,
  setAllHidden,
  shouldAutoRotate,
  slideLabel,
} from "./adSlot";

function memStore(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe("dismissal storage", () => {
  it("starts empty and tolerates missing storage", () => {
    expect(readDismissed(memStore())).toEqual([]);
    expect(readDismissed(null)).toEqual([]);
    expect(addDismissed(undefined, "abc")).toEqual(["abc"]);
  });
  it("remembers a closed product once", () => {
    const s = memStore();
    addDismissed(s, "p1");
    addDismissed(s, "p2");
    addDismissed(s, "p1");
    expect(readDismissed(s)).toEqual(["p2", "p1"]);
    expect(isDismissed(s, "p1")).toBe(true);
    expect(isDismissed(s, "p3")).toBe(false);
  });
  it("ignores corrupt data and bad ids", () => {
    expect(readDismissed(memStore({ [DISMISSED_KEY]: "{oops" }))).toEqual([]);
    expect(readDismissed(memStore({ [DISMISSED_KEY]: '{"a":1}' }))).toEqual([]);
    expect(readDismissed(memStore({ [DISMISSED_KEY]: '["ok",5,"bad id!"]' }))).toEqual(["ok"]);
    expect(addDismissed(memStore(), "bad id!")).toEqual([]);
  });
  it("caps the list and keeps the newest", () => {
    const s = memStore();
    for (let i = 0; i < MAX_REMEMBERED + 5; i++) addDismissed(s, `id${i}`);
    const list = readDismissed(s);
    expect(list).toHaveLength(MAX_REMEMBERED);
    expect(list[list.length - 1]).toBe(`id${MAX_REMEMBERED + 4}`);
  });
  it("does not throw when storage fails", () => {
    const bad = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
    expect(readDismissed(bad)).toEqual([]);
    expect(() => addDismissed(bad, "p1")).not.toThrow();
    expect(areAllHidden(bad)).toBe(false);
    expect(() => setAllHidden(bad, true)).not.toThrow();
  });
  it("hide all toggles", () => {
    const s = memStore();
    expect(areAllHidden(s)).toBe(false);
    setAllHidden(s, true);
    expect(areAllHidden(s)).toBe(true);
    setAllHidden(s, false);
    expect(areAllHidden(s)).toBe(false);
  });
});

describe("slide index logic", () => {
  it("wraps forwards and backwards", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(prevIndex(0, 3)).toBe(2);
    expect(prevIndex(2, 3)).toBe(1);
    expect(nextIndex(0, 0)).toBe(0);
    expect(prevIndex(0, 0)).toBe(0);
  });
  it("clamps after a slide is removed", () => {
    expect(clampIndex(4, 3)).toBe(2);
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(1, 0)).toBe(0);
    expect(clampIndex(Number.NaN, 3)).toBe(0);
  });
  it("labels slides", () => {
    expect(slideLabel(1, 5)).toBe("Slide 2 of 5");
  });
  it("auto rotates only when nothing blocks it", () => {
    const base = { count: 3, userPaused: false, hovering: false, focused: false, tabHidden: false, reducedMotion: false };
    expect(shouldAutoRotate(base)).toBe(true);
    expect(shouldAutoRotate({ ...base, count: 1 })).toBe(false);
    expect(shouldAutoRotate({ ...base, userPaused: true })).toBe(false);
    expect(shouldAutoRotate({ ...base, hovering: true })).toBe(false);
    expect(shouldAutoRotate({ ...base, focused: true })).toBe(false);
    expect(shouldAutoRotate({ ...base, tabHidden: true })).toBe(false);
    expect(shouldAutoRotate({ ...base, reducedMotion: true })).toBe(false);
  });
});
