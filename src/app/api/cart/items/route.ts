import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { isPubliclyVisible } from "@/features/catalogue";
import { addToCartSchema, updateCartItemSchema } from "@/features/cart/quote";

/**
 * POST /api/cart/items – add or update quantity
 * Body: { listingId, quantity }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const parsed = addToCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { listingId, quantity } = parsed.data;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { store: { select: { isActive: true } } },
    });

    if (!listing || !isPubliclyVisible(listing)) {
      return NextResponse.json(
        { error: "Product is not available" },
        { status: 400 }
      );
    }

    // Stock check for physical
    if (
      listing.productType === "PHYSICAL" &&
      listing.stock !== null &&
      quantity > listing.stock
    ) {
      return NextResponse.json(
        { error: `Only ${listing.stock} in stock` },
        { status: 400 }
      );
    }

    // Ensure cart exists
    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const item = await prisma.cartItem.upsert({
      where: {
        cartId_listingId: { cartId: cart.id, listingId },
      },
      create: {
        cartId: cart.id,
        listingId,
        quantity,
      },
      update: {
        quantity,
      },
    });

    return NextResponse.json({ item });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("cart add error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/cart/items – update quantity (0 removes)
 * Body: { listingId, quantity }
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const listingId = body.listingId as string;
    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    const parsed = updateCartItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (parsed.data.quantity === 0) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, listingId },
      });
      return NextResponse.json({ removed: true });
    }

    // Stock re-check
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { store: { select: { isActive: true } } },
    });
    if (!listing || !isPubliclyVisible(listing)) {
      return NextResponse.json({ error: "Product is not available" }, { status: 400 });
    }
    if (
      listing.productType === "PHYSICAL" &&
      listing.stock !== null &&
      parsed.data.quantity > listing.stock
    ) {
      return NextResponse.json(
        { error: `Only ${listing.stock} in stock` },
        { status: 400 }
      );
    }

    const item = await prisma.cartItem.update({
      where: { cartId_listingId: { cartId: cart.id, listingId } },
      data: { quantity: parsed.data.quantity },
    });

    return NextResponse.json({ item });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
