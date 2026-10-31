import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import {
  updateListingSchema,
  isMaterialChange,
} from "@/features/listings/listing";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET    /api/seller/listings/:id
 * PATCH  /api/seller/listings/:id  – update (material edits re-queue APPROVED listings)
 * DELETE /api/seller/listings/:id  – archive own listing
 */
export async function GET(req: NextRequest, context: Ctx) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["SELLER", "ADMIN"]);
    const { id } = await context.params;
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { store: true, category: true },
    });
    if (!listing || listing.store.ownerId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ listing });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["SELLER", "ADMIN"]);
    const { id } = await context.params;
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const existing = await prisma.listing.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!existing || existing.store.ownerId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const update = parsed.data as Record<string, unknown>;
    let newStatus = existing.status;

    // Material edit of APPROVED listing → back to SUBMITTED
    if (existing.status === "APPROVED" && isMaterialChange(existing as never, update)) {
      newStatus = "SUBMITTED";
    }

    // Explicit submit action
    if (body.submit === true && (existing.status === "DRAFT" || existing.status === "REJECTED")) {
      newStatus = "SUBMITTED";
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        ...(update.title !== undefined ? { title: update.title as string } : {}),
        ...(update.description !== undefined ? { description: update.description as string } : {}),
        ...(update.price !== undefined ? { price: update.price as string } : {}),
        ...(update.currency !== undefined ? { currency: update.currency as string } : {}),
        ...(update.productType !== undefined ? { productType: update.productType as never } : {}),
        ...(update.stock !== undefined ? { stock: update.stock as number } : {}),
        ...(update.categoryId !== undefined ? { categoryId: update.categoryId as string } : {}),
        ...(update.attributes !== undefined ? { attributes: update.attributes as never } : {}),
        status: newStatus as never,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: newStatus === "SUBMITTED" && existing.status === "APPROVED"
          ? "LISTING_MATERIAL_EDIT_REQUEUED"
          : "LISTING_UPDATED",
        entity: "Listing",
        entityId: id,
        meta: { previousStatus: existing.status, newStatus },
      },
    });

    return NextResponse.json({ listing });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("update listing error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["SELLER", "ADMIN"]);
    const { id } = await context.params;
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const existing = await prisma.listing.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!existing || existing.store.ownerId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "LISTING_ARCHIVED",
        entity: "Listing",
        entityId: id,
      },
    });

    return NextResponse.json({ listing });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
