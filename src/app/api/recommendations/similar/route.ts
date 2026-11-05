import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { resolveActor } from "@/features/recommendations/actor";
import { dismissedFor, similarFor } from "@/features/recommendations/data";
import { rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

/** GET /api/recommendations/similar?product=<id or slug>: similar products and "customers also viewed". */
export async function GET(req: NextRequest) {
  const empty = { recommendations: [] };
  if (!isDatabaseConfigured() || !prisma) return NextResponse.json(empty);
  try {
    const product = req.nextUrl.searchParams.get("product") ?? "";
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(product)) return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    const actor = await resolveActor(req);
    const rl = rateLimit(`similar:${actor.userId ?? actor.anonId ?? actor.ip}`, 60, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const dismissed = actor.userId || actor.anonId ? await dismissedFor(actor) : new Set<string>();
    const res = await similarFor(product, dismissed);
    return NextResponse.json({
      recommendations: res.recs.map((r) => ({ ...r.dto, reason: r.reason, kind: r.kind })),
    });
  } catch (err) {
    console.error("similar recs error:", err instanceof Error ? err.message : err);
    return NextResponse.json(empty);
  }
}
