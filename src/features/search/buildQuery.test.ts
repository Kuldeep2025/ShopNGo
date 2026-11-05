import { describe, expect, it } from "vitest";
import { buildSearchOrderBy, buildSearchWhere } from "./buildQuery";
import type { SearchQuery } from "./schema";

const base = { sort: "newest", limit: 20 } as SearchQuery;

describe("search query building", () => {
  it("only ever looks at approved listings from active stores", () => {
    expect(buildSearchWhere(base)).toMatchObject({ status: "APPROVED", store: { isActive: true } });
  });

  it("a category matches itself and the sub-categories under it", () => {
    const where = buildSearchWhere({ ...base, category: "electronics" });
    expect(where.category).toEqual({ OR: [{ slug: "electronics" }, { parent: { slug: "electronics" } }] });
  });

  it("applies the price range", () => {
    const where = buildSearchWhere({ ...base, minPrice: 100, maxPrice: 500 });
    expect(where.price).toEqual({ gte: 100, lte: 500 });
  });

  it("maps every sort to a stable order", () => {
    expect(buildSearchOrderBy("price_asc")).toEqual({ price: "asc" });
    expect(buildSearchOrderBy("price_desc")).toEqual({ price: "desc" });
    expect(buildSearchOrderBy("title")).toEqual({ title: "asc" });
    expect(buildSearchOrderBy("newest")).toEqual({ createdAt: "desc" });
  });
});
