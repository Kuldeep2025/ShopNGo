import { describe, expect, it } from "vitest";
import { fallbackStats, getSiteStats, statTiles } from "./siteStats";
import { MALL_TOTAL } from "@/lib/mall/specs";

describe("site stats", () => {
  it("fallback is computed from the mall catalogue and marked as fallback", () => {
    const s = fallbackStats(new Date("2026-11-06T00:00:00Z"));
    expect(s.products).toBe(MALL_TOTAL);
    expect(s.source).toBe("fallback");
    expect(s.stores).toBeGreaterThan(0);
    expect(s.categories).toBeGreaterThan(0);
    expect(s.updatedAt).toBe("2026-11-06T00:00:00.000Z");
  });

  it("never throws without a database and returns the fallback", async () => {
    const s = await getSiteStats();
    expect(s.source).toBe("fallback");
    expect(s.products).toBe(MALL_TOTAL);
  });

  it("fallback tiles hide numbers that cannot be known", () => {
    const keys = statTiles(fallbackStats()).map((t) => t.key);
    expect(keys).toEqual(["products", "stores", "categories"]);
  });

  it("live tiles include members, partners, orders and reviews", () => {
    const keys = statTiles({ ...fallbackStats(), source: "live" }).map((t) => t.key);
    expect(keys).toContain("users");
    expect(keys).toContain("reviews");
  });
});
