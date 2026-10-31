import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

/**
 * GET /api/moderator/audit – recent audit log (moderator only)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(req.headers.get("authorization"), ["MODERATOR", "ADMIN"]);
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ events: [], source: "no-db" });
    }
    const events = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    // Strip any accidental secrets from meta
    const safe = events.map((e) => ({
      id: e.id,
      actorId: e.actorId,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      meta: e.meta,
      createdAt: e.createdAt,
    }));
    return NextResponse.json({ events: safe });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
