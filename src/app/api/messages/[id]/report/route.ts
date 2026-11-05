import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rateLimit";
import { failure, sideOf } from "@/features/messaging/api";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ reason: z.string().trim().max(300).optional() });

/** POST /api/messages/:id/report – a participant reports a message so moderators can review it. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    const { id } = await ctx.params;
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Reporting is not available right now." }, { status: 503 });
    if (!rateLimit(`report:${user.id}`, 10, 60_000).allowed) return NextResponse.json({ error: "Please wait a minute before reporting again." }, { status: 429 });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "The reason can be at most 300 characters." }, { status: 400 });

    const message = await prisma.message.findUnique({ where: { id }, include: { conversation: true } });
    const side = message?.conversation ? await sideOf(user.id, message.conversation) : null;
    if (!message || !side) return NextResponse.json({ error: "Message not found." }, { status: 404 });
    if (message.userId === user.id) return NextResponse.json({ error: "You cannot report your own message." }, { status: 400 });

    await prisma.messageReport.upsert({
      where: { messageId_reporterId: { messageId: id, reporterId: user.id } },
      create: { messageId: id, reporterId: user.id, reason: parsed.data.reason || null },
      update: {},
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return failure(err, "message report");
  }
}
