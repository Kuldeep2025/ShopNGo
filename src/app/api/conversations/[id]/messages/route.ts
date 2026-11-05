import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rateLimit";
import { failure, sideOf, threadPhase } from "@/features/messaging/api";
import { checkSend, MAX_MESSAGE_LENGTH, MESSAGES_PER_MINUTE } from "@/features/messaging/rules";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ body: z.string().trim().min(1, "Write a message first.").max(MAX_MESSAGE_LENGTH, `Messages can be at most ${MAX_MESSAGE_LENGTH} characters.`) });

/** POST /api/conversations/:id/messages – reply as the customer or as the store's seller. Paused while the order is being delivered. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    const { id } = await ctx.params;
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Messaging is not available right now." }, { status: 503 });
    const limit = rateLimit(`msg:${user.id}`, MESSAGES_PER_MINUTE, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "You are sending messages too quickly. Please wait a minute and try again." }, { status: 429 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your message." }, { status: 400 });

    const conv = await prisma.conversation.findUnique({ where: { id } });
    const side = conv ? await sideOf(user.id, conv) : null;
    if (!conv || !side) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const { phase, inDelivery } = await threadPhase(conv);
    const check = checkSend({ sender: side, phase, customerHasInDeliveryOrder: inDelivery, topic: conv.topic, body: parsed.data.body, skipTopic: true });
    if (!check.ok) return NextResponse.json({ error: check.reason, code: check.code }, { status: check.code === "PAUSED" ? 409 : 400 });

    const message = await prisma.$transaction(async (tx) => {
      const m = await tx.message.create({
        data: { userId: user.id, storeId: conv.storeId, orderId: conv.orderId, conversationId: conv.id, senderRole: side, body: parsed.data.body },
      });
      await tx.conversation.update({
        where: { id: conv.id },
        data: side === "SELLER" ? { customerUnread: { increment: 1 }, sellerUnread: 0, lastMessageAt: m.createdAt } : { sellerUnread: { increment: 1 }, customerUnread: 0, lastMessageAt: m.createdAt },
      });
      return m;
    });
    return NextResponse.json({ message: { id: message.id, body: message.body, fromMe: true, senderRole: side, createdAt: message.createdAt, reported: false } }, { status: 201 });
  } catch (err) {
    return failure(err, "message send");
  }
}
