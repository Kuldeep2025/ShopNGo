import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import {
  createListingSchema,
  slugify,
} from "@/features/listings/listing";

/**
 * GET  /api/seller/listings – list current seller's listings
 * POST /api/seller/listings – create draft listing
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["SELLER", "ADMIN"]);
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ listings: [], source: "no-db" });
    }

    const store = await prisma.store.findFirst({
      where: { ownerId: user.id },
    });
    if (!store) {
      return NextResponse.json({ listings: [], message: "No store yet" });
    }

    const listings = await prisma.listing.findMany({
      where: { storeId: store.id },
      orderBy: { updatedAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ listings, storeId: store.id });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden – seller role required" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["SELLER", "ADMIN"]);
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const store = await prisma.store.findFirst({
      where: { ownerId: user.id, isActive: true },
    });
    if (!store) {
      return NextResponse.json(
        { error: "No active store. Complete seller application first." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = createListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const baseSlug = slugify(data.title);
    const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

    const listing = await prisma.listing.create({
      data: {
        storeId: store.id,
        title: data.title,
        slug,
        description: data.description,
        productType: data.productType,
        price: data.price,
        currency: data.currency ?? "INR",
        stock: data.productType === "PHYSICAL" ? (data as { stock: number }).stock : null,
        categoryId: data.categoryId ?? null,
        attributes: data.attributes as Prisma.InputJsonValue | undefined,
        status: body.submit ? "SUBMITTED" : "DRAFT",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: body.submit ? "LISTING_SUBMITTED" : "LISTING_DRAFT_CREATED",
        entity: "Listing",
        entityId: listing.id,
        meta: { title: listing.title, productType: listing.productType },
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("create listing error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
