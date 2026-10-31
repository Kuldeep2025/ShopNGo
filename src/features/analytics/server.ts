/**
 * Server-only helpers shared by the analytics API routes and pages.
 */
import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { DEMO_LISTINGS } from "@/lib/demo-data";
import { filterPublicListings, toPublicListingDTO, type PublicListingDTO } from "@/features/catalogue";
import { loadTransactions } from "./dataSource";
import type { AnalyticsSource, Transaction } from "./types";

/**
 * Store-wide analytics on real orders are restricted to moderators/admins.
 * In demo mode the data is synthetic, so the endpoints stay open for exploration.
 */
export async function loadAnalyticsForRequest(
  authorization: string | null
): Promise<{ ok: true; transactions: Transaction[]; source: AnalyticsSource } | { ok: false; response: NextResponse }> {
  if (isDatabaseConfigured()) {
    try {
      await requireRole(authorization, ["MODERATOR", "ADMIN"]);
    } catch (err) {
      const status = (err as Error & { status?: number }).status ?? 500;
      const error = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Server error";
      return { ok: false, response: NextResponse.json({ error }, { status: status === 401 || status === 403 ? status : 500 }) };
    }
  }
  const { transactions, source } = await loadTransactions();
  return { ok: true, transactions, source };
}

/** Resolve a public product slug to its listing id (demo or database). */
export async function listingIdForSlug(slug: string, source: AnalyticsSource): Promise<string | null> {
  if (source !== "database" || !prisma) {
    return DEMO_LISTINGS.find((l) => l.slug === slug)?.id ?? null;
  }
  const listing = await prisma.listing.findFirst({ where: { slug, status: "APPROVED" }, select: { id: true } });
  return listing?.id ?? null;
}

/** Fetch public DTOs for listing ids, preserving the given order; hidden listings are dropped. */
export async function publicListingsByIds(ids: string[], source: AnalyticsSource): Promise<PublicListingDTO[]> {
  if (ids.length === 0) return [];
  if (source !== "database" || !prisma) {
    return ids.map((id) => DEMO_LISTINGS.find((l) => l.id === id)).filter((l): l is PublicListingDTO => !!l);
  }
  const rows = await prisma.listing.findMany({
    where: { id: { in: ids }, status: "APPROVED", store: { isActive: true } },
    include: {
      store: { select: { id: true, name: true, slug: true, isActive: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });
  const dtos = filterPublicListings(rows).map(toPublicListingDTO);
  return ids.map((id) => dtos.find((d) => d.id === id)).filter((d): d is PublicListingDTO => !!d);
}
