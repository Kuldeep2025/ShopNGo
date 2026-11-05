/**
 * Build a parameterized Prisma where/orderBy from validated search params.
 * Only APPROVED listings on active stores are ever returned.
 */

import type { Prisma } from "@prisma/client";
import type { SearchQuery } from "./schema";

export function buildSearchWhere(q: SearchQuery): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    status: "APPROVED",
    store: { isActive: true },
  };

  if (q.q) {
    where.OR = [
      { title: { contains: q.q, mode: "insensitive" } },
      { description: { contains: q.q, mode: "insensitive" } },
    ];
  }

  if (q.category) {
    // A parent category also matches everything in its sub-categories.
    where.category = { OR: [{ slug: q.category }, { parent: { slug: q.category } }] };
  }

  if (q.type) {
    where.productType = q.type;
  }

  // Price range
  const priceFilter: Prisma.DecimalFilter = {};
  if (q.minPrice !== undefined) {
    priceFilter.gte = q.minPrice;
  }
  if (q.maxPrice !== undefined) {
    priceFilter.lte = q.maxPrice;
  }

  // Target price mode (INR only)
  if (q.targetPrice !== undefined && q.priceMode) {
    if (q.priceMode === "below") {
      priceFilter.lte = q.targetPrice;
    } else {
      priceFilter.gte = q.targetPrice;
    }
  }

  if (Object.keys(priceFilter).length > 0) {
    where.price = priceFilter;
  }

  return where;
}

export function buildSearchOrderBy(
  sort: SearchQuery["sort"]
): Prisma.ListingOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "title":
      return { title: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}
