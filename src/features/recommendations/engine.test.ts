import { describe, it, expect } from "vitest";
import {
  buildCooccurrence,
  buildProfile,
  decay,
  rank,
  similarProducts,
  signalWeight,
  tokenize,
  type Item,
  type Signal,
} from "./engine";
import { TtlCache } from "./cache";

const NOW = Date.UTC(2026, 10, 6);
const DAY = 86_400_000;

function mk(id: string, o: Partial<Item> = {}): Item {
  return {
    id,
    title: `Item ${id}`,
    categoryId: "c1",
    categoryName: "Shoes",
    categorySlug: "shoes",
    parentId: "p1",
    parentSlug: "fashion",
    storeId: "s1",
    storeName: "Store 1",
    brand: null,
    price: 1000,
    inStock: true,
    avgRating: 4,
    ratingCount: 5,
    createdAt: NOW - 30 * DAY,
    ...o,
  };
}

function catalogue(): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < 12; i++) out.push(mk(`shoe${i}`, { title: `Runner shoe ${i}`, categoryId: "c-shoes", categoryName: "Running Shoes", storeId: `s${i % 4}`, brand: i % 2 ? "Nike" : "Puma" }));
  for (let i = 0; i < 12; i++) out.push(mk(`phone${i}`, { title: `Phone case ${i}`, categoryId: "c-phone", categoryName: "Phone Cases", parentId: "p2", storeId: `s${i % 4}`, price: 300 }));
  for (let i = 0; i < 12; i++) out.push(mk(`book${i}`, { title: `Novel book ${i}`, categoryId: "c-book", categoryName: "Books", parentId: "p3", storeId: `s${i % 4}`, price: 400 }));
  for (let i = 0; i < 6; i++) out.push(mk(`sock${i}`, { title: `Sports sock ${i}`, categoryId: "c-sock", categoryName: "Socks", parentId: "p1", storeId: `s${i % 4}`, price: 200 }));
  return out;
}
const byId = (items: Item[]) => new Map(items.map((i) => [i.id, i]));
const run = (items: Item[], signals: Signal[], extra: Partial<Parameters<typeof rank>[3]> = {}) => {
  const m = byId(items);
  const profile = buildProfile(signals, m, NOW);
  return { profile, recs: rank(items, profile, m, { limit: 8, now: NOW, ...extra }) };
};

describe("decay and weights", () => {
  it("halves every 14 days", () => {
    expect(decay(0)).toBeCloseTo(1);
    expect(decay(14 * DAY)).toBeCloseTo(0.5);
    expect(decay(28 * DAY)).toBeCloseTo(0.25);
  });
  it("orders signal strength and handles ratings", () => {
    expect(signalWeight({ kind: "PURCHASE", at: 0 })).toBeGreaterThan(signalWeight({ kind: "CART", at: 0 }));
    expect(signalWeight({ kind: "CART", at: 0 })).toBeGreaterThan(signalWeight({ kind: "VIEW", at: 0 }));
    expect(signalWeight({ kind: "REVIEW", at: 0, rating: 5 })).toBeGreaterThan(0);
    expect(signalWeight({ kind: "REVIEW", at: 0, rating: 1 })).toBeLessThan(0);
    expect(signalWeight({ kind: "REVIEW", at: 0, rating: 3 })).toBe(0);
    expect(signalWeight({ kind: "DISMISS", at: 0 })).toBeLessThan(0);
  });
  it("recent interest counts more than old interest", () => {
    const items = catalogue();
    const m = byId(items);
    const fresh = buildProfile([{ kind: "VIEW", at: NOW, productId: "shoe0" }], m, NOW);
    const old = buildProfile([{ kind: "VIEW", at: NOW - 28 * DAY, productId: "shoe0" }], m, NOW);
    expect(fresh.categories.get("c-shoes")!).toBeGreaterThan(old.categories.get("c-shoes")! * 3);
  });
  it("tokenises titles", () => {
    expect(tokenize("Running Shoes for the Men 500 ml")).toEqual(["running", "shoe", "men"]);
  });
});

describe("price band", () => {
  it("uses the median of interacted prices", () => {
    const items = [mk("a", { price: 100 }), mk("b", { price: 1000 }), mk("c", { price: 1000 }), mk("d", { price: 1000 })];
    const profile = buildProfile(items.map((i) => ({ kind: "PURCHASE" as const, at: NOW, productId: i.id })), byId(items), NOW);
    expect(profile.price!.median).toBeCloseTo(1000, 0);
  });
  it("prefers products inside the usual price range", () => {
    const items = [
      mk("bought", { price: 1000, categoryId: "x", title: "alpha" }),
      mk("cheap", { price: 1000, categoryId: "y", title: "beta" }),
      mk("pricey", { price: 90000, categoryId: "z", title: "gamma" }),
    ];
    const { recs } = run(items, [{ kind: "PURCHASE", at: NOW, productId: "bought" }], { limit: 2 });
    expect(recs.map((r) => r.id)).toEqual(["cheap", "pricey"]);
  });
});

describe("personalisation", () => {
  it("leans to categories the shopper interacts with", () => {
    const items = catalogue();
    const { recs } = run(items, [
      { kind: "VIEW", at: NOW, productId: "shoe0" },
      { kind: "CART", at: NOW, productId: "shoe1" },
      { kind: "PURCHASE", at: NOW - DAY, productId: "shoe2" },
    ]);
    const shoes = recs.filter((r) => r.id.startsWith("shoe")).length;
    expect(shoes).toBeGreaterThanOrEqual(3);
    expect(recs[0]!.id.startsWith("shoe")).toBe(true);
    expect(recs.every((r) => r.reason.length > 5)).toBe(true);
  });
  it("explains with the purchased product", () => {
    const items = catalogue();
    const { recs } = run(items, [{ kind: "PURCHASE", at: NOW, productId: "shoe2" }]);
    expect(recs.find((r) => r.id.startsWith("shoe"))!.reason).toContain("Because you bought Runner shoe 2");
  });
  it("excludes purchased, dismissed, excluded and out of stock items", () => {
    const items = catalogue();
    items.find((i) => i.id === "shoe5")!.inStock = false;
    const { recs } = run(
      items,
      [
        { kind: "PURCHASE", at: NOW, productId: "shoe0" },
        { kind: "DISMISS", at: NOW, productId: "shoe1" },
        { kind: "VIEW", at: NOW, productId: "shoe3" },
      ],
      { exclude: new Set(["shoe6"]), limit: 40 }
    );
    const ids = recs.map((r) => r.id);
    for (const bad of ["shoe0", "shoe1", "shoe5", "shoe6"]) expect(ids).not.toContain(bad);
  });
  it("a dismissal suppresses the category", () => {
    const items = catalogue();
    const { recs } = run(
      items,
      [
        { kind: "VIEW", at: NOW, productId: "phone0" },
        { kind: "DISMISS", at: NOW, productId: "book0" },
        { kind: "DISMISS", at: NOW, productId: "book1" },
      ],
      { limit: 10 }
    );
    const books = recs.map((r) => r.id).filter((id) => id.startsWith("book"));
    expect(books.length).toBeLessThanOrEqual(recs.length / 4);
    expect(recs.slice(0, 4).some((r) => r.id.startsWith("book"))).toBe(false);
  });
  it("a one star review lowers its category", () => {
    const items = catalogue();
    const { profile } = run(items, [{ kind: "REVIEW", at: NOW, productId: "book0", rating: 1 }]);
    expect(profile.categories.get("c-book")!).toBeLessThan(0);
  });
});

describe("cold start", () => {
  it("falls back to popularity and trend with no history", () => {
    const items = catalogue();
    items.find((i) => i.id === "book3")!.avgRating = 5;
    items.find((i) => i.id === "book3")!.ratingCount = 40;
    items.find((i) => i.id === "book3")!.trend = 1;
    const { recs, profile } = run(items, []);
    expect(profile.positiveMass).toBe(0);
    expect(recs[0]!.id).toBe("book3");
    expect(recs.length).toBe(8);
    expect(recs.every((r) => r.reason.length > 0)).toBe(true);
  });
  it("guest search signals shape results", () => {
    const items = catalogue();
    const { recs } = run(items, [{ kind: "SEARCH", at: NOW, query: "phone case" }, { kind: "SEARCH", at: NOW, query: "phone" }]);
    expect(recs[0]!.id.startsWith("phone")).toBe(true);
    expect(recs[0]!.reason).toContain("search");
  });
});

describe("collaborative filtering", () => {
  it("boosts items bought by people who bought the same thing", () => {
    const items = [
      mk("seed", { categoryId: "a", title: "alpha" }),
      mk("partner", { categoryId: "b", title: "beta", avgRating: 3, ratingCount: 1 }),
      mk("other", { categoryId: "c", title: "gamma", avgRating: 4.5, ratingCount: 20 }),
    ];
    const baskets = Array.from({ length: 6 }, () => ["seed", "partner"]);
    baskets.push(["other", "x"], ["other", "y"]);
    const cooc = buildCooccurrence(baskets);
    expect(cooc.sim("seed", "partner")).toBeCloseTo(1);
    const m = byId(items);
    const profile = buildProfile([{ kind: "PURCHASE", at: NOW, productId: "seed" }], m, NOW);
    const withCf = rank(items, profile, m, { limit: 2, now: NOW, cooc });
    const withoutCf = rank(items, profile, m, { limit: 2, now: NOW });
    expect(withCf[0]!.id).toBe("partner");
    expect(withCf[0]!.reason).toBe("Popular with people who bought Item seed".replace("Item seed", "alpha"));
    expect(withoutCf[0]!.id).toBe("other");
  });
  it("similar products combine category and co-viewing, and skip itself and out of stock", () => {
    const items = [mk("t", { title: "red shoe" }), mk("co", { categoryId: "z", title: "lamp" }), mk("same", { title: "blue shoe" }), mk("gone", { title: "red shoe two", inStock: false })];
    const cooc = buildCooccurrence([["t", "co"], ["t", "co"], ["t", "same"]]);
    const res = similarProducts(items[0]!, items, cooc, { limit: 5, now: NOW });
    expect(res.map((r) => r.id)).not.toContain("t");
    expect(res.map((r) => r.id)).not.toContain("gone");
    expect(res[0]!.id).toBe("same");
    expect(res.map((r) => r.id)).toContain("co");
    expect(res.find((r) => r.id === "co")!.reason).toContain("also liked");
  });
});

describe("diversity and exploration", () => {
  it("caps items per category and store inside a window", () => {
    const items = catalogue();
    const { recs } = run(items, [
      { kind: "PURCHASE", at: NOW, productId: "shoe0" },
      { kind: "PURCHASE", at: NOW, productId: "shoe1" },
      { kind: "CART", at: NOW, productId: "shoe2" },
    ], { limit: 12 });
    const m = byId(items);
    const cats = new Map<string, number>();
    const stores = new Map<string, number>();
    for (const r of recs) {
      const it = m.get(r.id)!;
      cats.set(it.categoryId!, (cats.get(it.categoryId!) ?? 0) + 1);
      stores.set(it.storeId, (stores.get(it.storeId) ?? 0) + 1);
    }
    expect(Math.max(...cats.values())).toBeLessThanOrEqual(4);
    expect(Math.max(...stores.values())).toBeLessThanOrEqual(4);
    expect(recs.length).toBe(12);
  });
  it("reserves about 15 percent for adjacent categories", () => {
    const items = catalogue();
    const { recs } = run(items, [
      { kind: "PURCHASE", at: NOW, productId: "shoe0" },
      { kind: "PURCHASE", at: NOW, productId: "shoe1" },
    ], { limit: 12 });
    const explore = recs.filter((r) => r.kind === "explore");
    expect(explore.length).toBeGreaterThanOrEqual(1);
    expect(explore.length).toBeLessThanOrEqual(3);
    const m = byId(items);
    expect(m.get(explore[0]!.id)!.categoryId).toBe("c-sock");
  });
  it("never returns duplicates", () => {
    const items = catalogue();
    const { recs } = run(items, [{ kind: "VIEW", at: NOW, productId: "shoe0" }], { limit: 30 });
    expect(new Set(recs.map((r) => r.id)).size).toBe(recs.length);
  });
});

describe("TtlCache", () => {
  it("expires entries", () => {
    const c = new TtlCache<number>(60_000);
    c.set("a", 1, 0);
    expect(c.get("a", 59_000)).toBe(1);
    expect(c.get("a", 61_000)).toBeUndefined();
  });
});
