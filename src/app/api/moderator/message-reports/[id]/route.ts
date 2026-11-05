import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { failure } from "@/features/messaging/api";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/moderator/message-reports/:id – mark a report as handled. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const mod = await requireRole(req.headers.get("authorization"), ["MODERATOR", "ADMIN"]);
    const { id } = await ctx.params;
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Not available." }, { status: 503 });
    const res = await prisma.messageReport.updateMany({ where: { id, status: "OPEN" }, data: { status: "RESOLVED", resolvedBy: mod.id, resolvedAt: new Date() } });
    if (res.count === 0) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return failure(err, "message report resolve");
  }
}
