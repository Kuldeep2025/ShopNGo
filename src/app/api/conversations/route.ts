import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rateLimit";
import { failure, safeDisplayName, TOPIC_LABEL } from "@/features/messaging/api";
import { checkSend, defaultTopic, MAX_MESSAGE_LENGTH, MESSAGES_PER_MINUTE, TOPICS, threadKeyOf } from "@/features/messaging/rules";
import { hasInDeliveryOrder, itemsWithPhase } from "@/features/messaging/server";

export const dynamic = "force-dynamic";

const startSchema = z.object({
  listingId: z.string().min(1).optional(),
  orderItemId: z.string().min(1).optional(),
  topic: z.enum(TOPICS).optional(),
  body: z.string().trim().min(1, "Write a message first.").max(MAX_MESSAGE_LENGTH, `Messages can be at most ${MAX_MESSAGE_LENGTH} characters.`),
});

/**
 * GET /api/conversations?as=customer|seller – conversation list with unread counts.
 * Sellers see their stores' customers by first name only. No phone numbers or emails are ever returned.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ conversations: [], source: "no-db" });
    const as = req.nextUrl.searchParams.get("as") === "seller" ? "seller" : "customer";

    let where;
    if (as === "seller") {
      const stores = await prisma.store.findMany({ where: { ownerId: user.id }, select: { id: true } });
      if (stores.length === 0) return NextResponse.json({ conversations: [], unread: 0 });
      where = { storeId: { in: stores.map((s) => s.id) } };
    } else {
      where = { customerId: user.id };
    }
    const rows = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        customer: { select: { displayName: true } },
        store: { select: { name: true, slug: true } },
        listing: { select: { title: true, slug: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderRole: true, createdAt: true } },
      },
    });
    const conversations = rows.map((c) => {
      const last = c.messages[0];
      return {
        id: c.id,
        topic: c.topic,
        topicLabel: TOPIC_LABEL[c.topic] ?? c.topic,
        product: c.listing?.title ?? "Order item",
        productSlug: c.listing?.slug ?? null,
        storeName: c.store.name,
        customerName: safeDisplayName(c.customer.displayName),
        orderRef: c.orderId ? c.orderId.slice(-8) : null,
        orderId: as === "customer" ? c.orderId : null,
        unread: as === "seller" ? c.sellerUnread : c.customerUnread,
        lastMessageAt: c.lastMessageAt,
        lastMessage: last ? { body: last.body.slice(0, 140), fromMe: last.senderRole === (as === "seller" ? "SELLER" : "CUSTOMER"), createdAt: last.createdAt } : null,
      };
    });
    return NextResponse.json({ conversations, unread: conversations.reduce((n, c) => n + c.unread, 0) });
  } catch (err) {
    return failure(err, "conversations list");
  }
}

/**
 * POST /api/conversations – a customer starts (or continues) a conversation with a seller.
 * Body: { listingId } for a question before buying, or { orderItemId, topic } for an ordered item.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Messaging is not available right now." }, { status: 503 });
    const limit = rateLimit(`msg:${user.id}`, MESSAGES_PER_MINUTE, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "You are sending messages too quickly. Please wait a minute and try again." }, { status: 429 });

    const parsed = startSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your message." }, { status: 400 });
    const { listingId, orderItemId, body } = parsed.data;
    if (!listingId && !orderItemId) return NextResponse.json({ error: "Choose a product or an order item to message about." }, { status: 400 });

    let storeId: string;
    let resolvedListingId: string | null = null;
    let orderId: string | null = null;
    let phase: "BEFORE_DELIVERY" | "IN_DELIVERY" | "DELIVERED" | "CLOSED" | null = null;
    let inDelivery = false;

    if (orderItemId) {
      const [item] = await itemsWithPhase(user.id, { id: orderItemId });
      if (!item) return NextResponse.json({ error: "We could not find that order item." }, { status: 404 });
      storeId = item.storeId;
      resolvedListingId = item.listingId;
      orderId = item.orderId;
      phase = item.phase;
    } else {
      const listing = await prisma.listing.findFirst({
        where: { id: listingId!, status: "APPROVED", store: { isActive: true } },
        select: { id: true, storeId: true },
      });
      if (!listing) return NextResponse.json({ error: "We could not find that product." }, { status: 404 });
      storeId = listing.storeId;
      resolvedListingId = listing.id;
      inDelivery = await hasInDeliveryOrder(user.id, listing.id);
    }

    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { ownerId: true } });
    if (!store) return NextResponse.json({ error: "We could not find that store." }, { status: 404 });
    if (store.ownerId === user.id) return NextResponse.json({ error: "You cannot message your own store." }, { status: 400 });

    const topic = parsed.data.topic ?? defaultTopic(phase);
    const check = checkSend({ sender: "CUSTOMER", phase, customerHasInDeliveryOrder: inDelivery, topic, body });
    if (!check.ok) return NextResponse.json({ error: check.reason, code: check.code }, { status: check.code === "PAUSED" ? 409 : 400 });

    const threadKey = threadKeyOf({ customerId: user.id, storeId, listingId: resolvedListingId, orderItemId: orderItemId ?? null, topic });
    const result = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.upsert({
        where: { threadKey },
        create: { threadKey, customerId: user.id, storeId, listingId: resolvedListingId, orderId, orderItemId: orderItemId ?? null, topic: orderItemId ? topic : "PRESALE" },
        update: {},
      });
      const message = await tx.message.create({
        data: { userId: user.id, storeId, orderId, conversationId: conv.id, senderRole: "CUSTOMER", body },
      });
      await tx.conversation.update({ where: { id: conv.id }, data: { sellerUnread: { increment: 1 }, customerUnread: 0, lastMessageAt: message.createdAt } });
      return { conversationId: conv.id, messageId: message.id };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return failure(err, "conversation start");
  }
}
