import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { failure, safeDisplayName } from "@/features/messaging/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/moderator/message-reports – reported messages only, with a little context
 * (the reported message and the two messages before it). Moderators never browse conversations.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(req.headers.get("authorization"), ["MODERATOR", "ADMIN"]);
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ reports: [] });
    const reports = await prisma.messageReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        reporter: { select: { displayName: true } },
        message: { include: { user: { select: { displayName: true } }, conversation: { include: { listing: { select: { title: true } }, store: { select: { name: true } } } } } },
      },
    });
    const out = await Promise.all(
      reports.map(async (r) => {
        const before = r.message.conversationId
          ? await prisma!.message.findMany({
              where: { conversationId: r.message.conversationId, createdAt: { lt: r.message.createdAt } },
              orderBy: { createdAt: "desc" },
              take: 2,
              select: { id: true, body: true, senderRole: true, createdAt: true },
            })
          : [];
        return {
          id: r.id,
          reason: r.reason,
          createdAt: r.createdAt,
          reporter: safeDisplayName(r.reporter.displayName),
          product: r.message.conversation?.listing?.title ?? "Order item",
          store: r.message.conversation?.store.name ?? "",
          message: { id: r.message.id, body: r.message.body, senderRole: r.message.senderRole, author: safeDisplayName(r.message.user.displayName), createdAt: r.message.createdAt },
          earlier: before.reverse(),
        };
      })
    );
    return NextResponse.json({ reports: out });
  } catch (err) {
    return failure(err, "message reports");
  }
}
