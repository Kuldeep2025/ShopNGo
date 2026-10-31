import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { moderateListingSchema } from "@/features/listings/listing";

/**
 * GET   /api/moderator/listings?status=SUBMITTED
 * PATCH /api/moderator/listings  – approve / reject / suspend
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(req.headers.get("authorization"), ["MODERATOR", "ADMIN"]);
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ listings: [], source: "no-db" });
    }

    const status = req.nextUrl.searchParams.get("status") ?? "SUBMITTED";

    const listings = await prisma.listing.findMany({
      where: { status: status as never },
      include: {
        store: { select: { id: true, name: true, slug: true, ownerId: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 50,
    });

    return NextResponse.json({ listings });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const moderator = await requireRole(req.headers.get("authorization"), [
      "MODERATOR",
      "ADMIN",
    ]);
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { listingId } = body;
    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    const parsed = moderateListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const listing = await prisma.$transaction(async (tx) => {
      const updated = await tx.listing.update({
        where: { id: listingId },
        data: { status: parsed.data.decision },
      });

      await tx.auditLog.create({
        data: {
          actorId: moderator.id,
          action: `LISTING_${parsed.data.decision}`,
          entity: "Listing",
          entityId: listingId,
          meta: {
            reason: parsed.data.reason,
            previousStatus: existing.status,
            title: existing.title,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ listing });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("moderate listing error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
