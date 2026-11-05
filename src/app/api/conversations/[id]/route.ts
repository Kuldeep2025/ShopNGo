import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { failure, sideOf, threadState, safeDisplayName, TOPIC_LABEL } from "@/features/messaging/api";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** GET /api/conversations/:id – messages, whether sending is allowed right now, and marks the thread read for the caller. */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    const { id } = await ctx.params;
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Messaging is not available right now." }, { status: 503 });
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: { select: { displayName: true } },
        store: { select: { name: true, slug: true } },
        listing: { select: { title: true, slug: true } },
      },
    });
    const side = conv ? await sideOf(user.id, conv) : null;
    if (!conv || !side) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const rows = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { reports: { where: { reporterId: user.id }, select: { id: true } } },
    });
    const messages = rows.reverse().map((m) => ({
      id: m.id,
      body: m.body,
      fromMe: m.senderRole === side,
      senderRole: m.senderRole,
      createdAt: m.createdAt,
      reported: m.reports.length > 0,
    }));
    const unreadField = side === "SELLER" ? "sellerUnread" : "customerUnread";
    if ((side === "SELLER" ? conv.sellerUnread : conv.customerUnread) > 0) {
      await prisma.conversation.update({ where: { id }, data: { [unreadField]: 0 } });
    }
    const state = await threadState(conv, side);
    return NextResponse.json({
      conversation: {
        id: conv.id,
        side,
        topic: conv.topic,
        topicLabel: TOPIC_LABEL[conv.topic] ?? conv.topic,
        product: conv.listing?.title ?? "Order item",
        productSlug: conv.listing?.slug ?? null,
        storeName: conv.store.name,
        customerName: safeDisplayName(conv.customer.displayName),
        orderId: side === "CUSTOMER" ? conv.orderId : null,
        orderRef: conv.orderId ? conv.orderId.slice(-8) : null,
      },
      messages,
      state,
    });
  } catch (err) {
    return failure(err, "conversation read");
  }
}
