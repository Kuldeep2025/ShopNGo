import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { isPubliclyVisible } from "@/features/catalogue";
import {
  type QuoteLine,
  type QuoteResult,
  multiplyMoney,
  addMoney,
} from "@/features/cart/quote";

/**
 * POST /api/cart/quote
 * Server-authoritative quote – reloads approval, price, stock.
 * Never trusts client totals.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      const empty: QuoteResult = {
        lines: [],
        subtotal: "0.00",
        currency: "INR",
        allAvailable: true,
        issues: ["Cart is empty"],
      };
      return NextResponse.json({ quote: empty });
    }

    const listingIds = cart.items.map((i) => i.listingId);
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: {
        store: { select: { id: true, name: true, isActive: true } },
      },
    });
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    const lines: QuoteLine[] = [];
    const globalIssues: string[] = [];

    for (const item of cart.items) {
      const listing = listingMap.get(item.listingId);
      const issues: string[] = [];
      let available = true;

      if (!listing) {
        available = false;
        issues.push("Product no longer exists");
      } else if (!isPubliclyVisible(listing)) {
        available = false;
        issues.push("Product is not available for purchase");
      } else if (
        listing.productType === "PHYSICAL" &&
        listing.stock !== null &&
        item.quantity > listing.stock
      ) {
        available = false;
        issues.push(`Only ${listing.stock} in stock (requested ${item.quantity})`);
      }

      const unitPrice = listing ? listing.price.toString() : "0.00";
      const lineTotal = available ? multiplyMoney(unitPrice, item.quantity) : "0.00";

      lines.push({
        listingId: item.listingId,
        title: listing?.title ?? "Unknown",
        productType: listing?.productType ?? "UNKNOWN",
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        currency: listing?.currency ?? "INR",
        storeId: listing?.store.id ?? "",
        storeName: listing?.store.name ?? "",
        available,
        issues,
      });

      if (!available) {
        globalIssues.push(...issues.map((i) => `${listing?.title ?? item.listingId}: ${i}`));
      }
    }

    const availableLines = lines.filter((l) => l.available);
    const subtotal = addMoney(availableLines.map((l) => l.lineTotal));
    const currency = lines[0]?.currency ?? "INR";

    const quote: QuoteResult = {
      lines,
      subtotal,
      currency,
      allAvailable: globalIssues.length === 0,
      issues: globalIssues,
    };

    return NextResponse.json({ quote });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("quote error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
