import { describe, expect, it } from "vitest";
import { generateMallCatalogue } from "./generate";
import { MALL_TOTAL } from "./specs";

describe("mall catalogue", () => {
  const products = generateMallCatalogue();

  it("has exactly 2230 products", () => {
    expect(MALL_TOTAL).toBe(2230);
    expect(products).toHaveLength(2230);
  });

  it("has unique ids, names, slugs and skus", () => {
    for (const key of ["id", "title", "slug", "sku"] as const) {
      expect(new Set(products.map((p) => p[key].toLowerCase())).size).toBe(products.length);
    }
  });

  it("gives every product a price, stock, three-sentence description, image and alt text", () => {
    for (const p of products) {
      expect(Number(p.price)).toBeGreaterThan(0);
      expect(p.stock).toBeGreaterThanOrEqual(0);
      expect(p.description.match(/\.(\s|$)/g)?.length).toBe(3);
      expect(p.imagePath).toMatch(/^\/images\/mall\/[a-z0-9-]+\.svg$/);
      expect(p.imageAlt.length).toBeGreaterThan(20);
      expect(p.brand.length).toBeGreaterThan(1);
    }
  });

  it("is deterministic", () => {
    expect(generateMallCatalogue().map((p) => p.title)).toEqual(products.map((p) => p.title));
  });
});
