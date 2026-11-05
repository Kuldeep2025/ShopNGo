import { describe, expect, it } from "vitest";
import {
  compareOffers,
  compareWithProduct,
  comparisonEvidence,
  groupByProduct,
  productKey,
  titleSimilarity,
  type Offer,
} from "./priceCompare";

const offer = (o: Partial<Offer> & { id: string; title: string; price: number; storeName: string }): Offer => ({
  slug: o.id,
  storeSlug: o.storeName.toLowerCase().replace(/\s+/g, "-"),
  currency: "INR",
  stock: 10,
  categoryId: "cat-audio",
  rating: null,
  reviewCount: 0,
  ...o,
});

describe("product matching", () => {
  it("ignores variant suffix, colours and sizes", () => {
    expect(productKey("Aurion Nova Earbuds - Black")).toBe(productKey("Aurion Nova Earbuds - White"));
    expect(productKey("Urbanloom Prime T-Shirt Red Large")).toBe(productKey("Urbanloom Prime T-Shirt Blue"));
    expect(productKey("Aurion Nova Earbuds")).not.toBe(productKey("Aurion Pure Earbuds"));
  });

  it("scores similar titles higher than different ones", () => {
    expect(titleSimilarity("Aurion Nova Earbuds", "Aurion Nova Earbuds Pro")).toBeGreaterThan(0.7);
    expect(titleSimilarity("Aurion Nova Earbuds", "Threadwell Eco Jacket")).toBe(0);
  });
});

describe("compareOffers", () => {
  const a = offer({ id: "a", title: "X Earbuds", price: 1499, storeName: "Store A", rating: 4.5, reviewCount: 20 });
  const b = offer({ id: "b", title: "X Earbuds", price: 1299, storeName: "Store B", rating: 3, reviewCount: 2 });
  const c = offer({ id: "c", title: "X Earbuds", price: 999, storeName: "Store C", stock: 0 });

  it("ranks cheapest first, skipping out-of-stock for the cheapest label", () => {
    const r = compareOffers([a, b, c]);
    expect(r.ranked.map((o) => o.id)).toEqual(["c", "b", "a"]);
    expect(r.cheapest?.id).toBe("b");
    expect(r.highest?.id).toBe("a");
    expect(r.savings).toBe(200);
    expect(r.savingsPercent).toBeCloseTo(13.3, 1);
    expect(r.stores).toBe(3);
  });

  it("picks best value by rating against price", () => {
    const r = compareOffers([
      offer({ id: "p", title: "T", price: 1000, storeName: "P", rating: 2, reviewCount: 30 }),
      offer({ id: "q", title: "T", price: 1100, storeName: "Q", rating: 4.8, reviewCount: 30 }),
    ]);
    expect(r.cheapest?.id).toBe("p");
    expect(r.bestValue?.id).toBe("q");
  });

  it("handles empty input", () => {
    const r = compareOffers([]);
    expect(r.cheapest).toBeNull();
    expect(r.savings).toBe(0);
  });
});

describe("compareWithProduct", () => {
  const base = offer({ id: "1", title: "Aurion Nova Earbuds - Black", price: 1500, storeName: "SoundHive" });
  it("finds the same product in other stores and similar ones apart", () => {
    const { same, similar } = compareWithProduct(base, [
      offer({ id: "2", title: "Aurion Nova Earbuds - White", price: 1400, storeName: "Gadget Hub" }),
      offer({ id: "3", title: "Aurion Nova Earbuds Pro - Black", price: 1700, storeName: "Gadget Hub" }),
      offer({ id: "4", title: "Threadwell Eco Jacket", price: 900, storeName: "Urbanloom" }),
      offer({ id: "5", title: "Aurion Nova Earbuds", price: 1200, storeName: "Other", categoryId: "cat-other" }),
    ]);
    expect(same.ranked.map((o) => o.id)).toEqual(["5", "2", "1"]);
    expect(similar.ranked.map((o) => o.id)).toEqual(["3"]);
  });

  it("is honest when no other store sells it", () => {
    const { same, similar } = compareWithProduct(base, []);
    const text = comparisonEvidence("Aurion Nova Earbuds", same, similar);
    expect(text).toContain("Only one store sells this exact item");
  });

  it("evidence names the cheapest store and the saving", () => {
    const { same } = compareWithProduct(base, [offer({ id: "2", title: "Aurion Nova Earbuds - White", price: 1400, storeName: "Gadget Hub" })]);
    const text = comparisonEvidence("Aurion Nova Earbuds", same);
    expect(text).toContain("Cheapest: Gadget Hub at Rs 1400");
    expect(text).toContain("Rs 100");
  });
});

describe("groupByProduct", () => {
  it("puts products sold by several stores first", () => {
    const g = groupByProduct([
      offer({ id: "1", title: "Solo Thing", price: 10, storeName: "A" }),
      offer({ id: "2", title: "Twin Thing - Red", price: 20, storeName: "B" }),
      offer({ id: "3", title: "Twin Thing - Blue", price: 15, storeName: "C" }),
    ]);
    expect(g[0]!.comparison.stores).toBe(2);
    expect(g[0]!.comparison.cheapest?.id).toBe("3");
  });
});
