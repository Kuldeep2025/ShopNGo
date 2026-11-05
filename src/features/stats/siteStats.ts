/**
 * Live numbers for the About page and GET /api/stats.
 * "products" uses the same filter as search: APPROVED listings on active stores,
 * so it is exactly what a visitor can find. Only public totals, never private data.
 */
import { prisma, isDatabaseConfigured } from "@/lib/db";
import type { SiteStats } from "./tiles";
import { MALL_PARENTS, MALL_SUBCATEGORIES, MALL_TOTAL } from "@/lib/mall/specs";


/** Numbers computed from the mall catalogue alone, used only when the database cannot be read. */
export function fallbackStats(now: Date = new Date()): SiteStats {
  return {
    products: MALL_TOTAL,
    stores: MALL_PARENTS.reduce((n, p) => n + p.stores.length, 0),
    categories: MALL_PARENTS.length + MALL_SUBCATEGORIES.length,
    users: 0,
    sellers: 0,
    deliveryPartners: 0,
    orders: 0,
    reviews: 0,
    averageRating: null,
    source: "fallback",
    updatedAt: now.toISOString(),
  };
}

export async function getSiteStats(): Promise<SiteStats> {
  if (!isDatabaseConfigured() || !prisma) return fallbackStats();
  try {
    const [products, stores, categories, users, sellers, deliveryPartners, orders, reviews, rating] = await Promise.all([
      prisma.listing.count({ where: { status: "APPROVED", store: { isActive: true } } }),
      prisma.store.count({ where: { isActive: true } }),
      prisma.category.count(),
      prisma.user.count(),
      prisma.user.count({ where: { roles: { has: "SELLER" } } }),
      prisma.deliveryPartner.count(),
      prisma.order.count(),
      prisma.review.count(),
      prisma.review.aggregate({ _avg: { rating: true } }),
    ]);
    const avg = rating._avg.rating;
    return {
      products,
      stores,
      categories,
      users,
      sellers,
      deliveryPartners,
      orders,
      reviews,
      averageRating: avg === null || avg === undefined ? null : Math.round(avg * 10) / 10,
      source: "live",
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("stats failed:", err instanceof Error ? err.message.slice(-200) : err);
    return fallbackStats();
  }
}

export { statTiles } from "./tiles";
export type { SiteStats } from "./tiles";
