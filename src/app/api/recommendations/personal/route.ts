import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { resolveActor } from "@/features/recommendations/actor";
import { personalFeed } from "@/features/recommendations/data";
import { rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations/personal: "Picked for you".
 * Query: limit (1 to 48, default 8), offset, category (slug), exclude (comma separated product ids).
 * Signed-in shoppers send the Bearer token; guests may send x-anon-id so their browsing counts.
 * Response: { personalised, recommendations[{...product, reason, kind, liked}], hasMore, nextOffset }.
 */
export async function GET(req: NextRequest) {
  const empty = { recommendations: [], personalised: false, hasMore: false, nextOffset: 0 };
  if (!isDatabaseConfigured() || !prisma) return NextResponse.json(empty);
  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(48, Math.max(1, Number.parseInt(sp.get("limit") ?? "8", 10) || 8));
    const offset = Math.min(60, Math.max(0, Number.parseInt(sp.get("offset") ?? "0", 10) || 0));
    const category = (sp.get("category") ?? "").toLowerCase();
    const categorySlug = /^[a-z0-9-]{1,80}$/.test(category) ? category : undefined;
    const exclude = new Set((sp.get("exclude") ?? "").split(",").filter((s) => /^[A-Za-z0-9_-]{1,64}$/.test(s)).slice(0, 100));

    const actor = await resolveActor(req);
    const rl = rateLimit(`recs:${actor.userId ?? actor.anonId ?? actor.ip}`, 60, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const feed = await personalFeed(actor, categorySlug);
    const visible = feed.ranked.filter((r) => !exclude.has(r.id) && feed.dtos.has(r.id));
    const page = visible.slice(offset, offset + limit);
    return NextResponse.json({
      personalised: feed.personalised,
      recommendations: page.map((r) => ({
        ...feed.dtos.get(r.id)!,
        reason: r.reason,
        kind: r.kind,
        liked: feed.liked.has(r.id),
      })),
      hasMore: offset + limit < visible.length,
      nextOffset: offset + page.length,
    });
  } catch (err) {
    console.error("personal recs error:", err instanceof Error ? err.message : err);
    return NextResponse.json(empty);
  }
}
