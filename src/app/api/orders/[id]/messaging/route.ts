import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { failure } from "@/features/messaging/api";
import { itemMessaging, AFTER_DELIVERY_TOPICS, PAUSED_TEXT } from "@/features/messaging/rules";
import { itemsWithPhase } from "@/features/messaging/server";
import { returnPolicyText, warrantyText, returnWindowEnds } from "@/features/policy/policy";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** GET /api/orders/:id/messaging – per item: may the customer message the seller now, and the seller's policy. */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    const { id } = await ctx.params;
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ items: [] });
    const items = await itemsWithPhase(user.id, { orderId: id });
    if (items.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const listings = await prisma.listing.findMany({
      where: { id: { in: items.map((i) => i.listingId) } },
      select: { id: true, returnDays: true, warrantyMonths: true, guaranteeText: true, replacementPolicy: true },
    });
    const byId = new Map(listings.map((l) => [l.id, l]));
    const threads = await prisma.conversation.findMany({
      where: { customerId: user.id, orderItemId: { in: items.map((i) => i.id) } },
      select: { id: true, orderItemId: true, topic: true, customerUnread: true },
    });
    return NextResponse.json({
      pausedText: PAUSED_TEXT,
      topics: AFTER_DELIVERY_TOPICS,
      items: items.map((i) => {
        const l = byId.get(i.listingId);
        const m = itemMessaging(i.phase);
        return {
          orderItemId: i.id,
          listingId: i.listingId,
          title: i.title,
          ...m,
          policy: l
            ? {
                returns: returnPolicyText(l.returnDays),
                warranty: warrantyText(l.warrantyMonths),
                guarantee: l.guaranteeText,
                replacement: l.replacementPolicy,
                returnWindowEnds: i.deliveredAt ? returnWindowEnds(i.deliveredAt, l.returnDays) : null,
              }
            : null,
          conversations: threads.filter((t) => t.orderItemId === i.id),
        };
      }),
    });
  } catch (err) {
    return failure(err, "order messaging");
  }
}
