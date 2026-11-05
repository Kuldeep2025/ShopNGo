import { describe, expect, it } from "vitest";
import { COPY, COPY_IDS, type CopyId } from "@/features/copy/variants";
import { pickIndex, pickVariant, variantAt } from "@/features/copy/pick";
import { LOGO_COUNT } from "@/features/brand/logoRotation";
import { nextLogoIndex } from "@/features/brand/logoRotation";

describe("copy variants dictionary", () => {
  it("has at least 40 ids", () => {
    expect(COPY_IDS.length).toBeGreaterThanOrEqual(40);
  });

  it.each(COPY_IDS)("%s has 10 to 15 non-empty unique variants", (id) => {
    const list = COPY[id] as readonly string[];
    expect(list.length).toBeGreaterThanOrEqual(10);
    expect(list.length).toBeLessThanOrEqual(15);
    for (const v of list) {
      expect(typeof v).toBe("string");
      expect(v.trim().length).toBeGreaterThan(0);
    }
    const normal = list.map((v) => v.trim().toLowerCase());
    expect(new Set(normal).size).toBe(list.length);
  });
});

describe("variant picker", () => {
  it("never returns undefined, even with odd random values", () => {
    const randoms = [0, 0.0001, 0.5, 0.999999, 1, 1.5, -1, NaN, Infinity];
    for (const id of COPY_IDS) {
      for (const r of randoms) {
        const v = pickVariant(id, () => r);
        expect(typeof v).toBe("string");
        expect(v.length).toBeGreaterThan(0);
      }
    }
  });

  it("pickIndex stays within range", () => {
    for (let i = 0; i < 1000; i++) {
      const n = 1 + (i % 15);
      const idx = pickIndex(n, () => Math.random());
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(n);
    }
  });

  it("variantAt falls back to variant 0 for a bad index", () => {
    const id = COPY_IDS[0] as CopyId;
    expect(variantAt(id, 999)).toBe((COPY[id] as readonly string[])[0]);
    expect(variantAt(id)).toBe((COPY[id] as readonly string[])[0]);
  });
});

describe("logo rotation", () => {
  it("never repeats the previous logo and stays in range", () => {
    let prev = 0;
    for (let i = 0; i < 5000; i++) {
      const next = nextLogoIndex(prev, LOGO_COUNT, Math.random);
      expect(next).not.toBe(prev);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(LOGO_COUNT);
      prev = next;
    }
  });

  it("holds for every previous index and every random edge value", () => {
    for (let prev = 0; prev < LOGO_COUNT; prev++) {
      for (const r of [0, 0.2, 0.5, 0.8, 0.999999, 1, NaN]) {
        const next = nextLogoIndex(prev, LOGO_COUNT, () => r);
        expect(next).not.toBe(prev);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(LOGO_COUNT);
      }
    }
  });

  it("can reach every design", () => {
    const seen = new Set<number>();
    let prev = 0;
    for (let i = 0; i < 500; i++) {
      prev = nextLogoIndex(prev, LOGO_COUNT, Math.random);
      seen.add(prev);
    }
    expect(seen.size).toBe(LOGO_COUNT);
  });
});
