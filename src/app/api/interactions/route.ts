import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { rateLimit } from "@/lib/security/rateLimit";
import { resolveActor } from "@/features/recommendations/actor";
import { invalidateFeed } from "@/features/recommendations/data";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  type: z.enum(["VIEW", "SEARCH", "CART", "LIKE", "DISMISS"]),
  productRef: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
  query: z.string().trim().min(2).max(80).optional(),
  dwellMs: z.number().min(0).max(3_600_000).optional(),
});
const bodySchema = z.object({
  anonId: z.string().optional(),
  events: z.array(eventSchema).min(1).max(10).optional(),
  type: eventSchema.shape.type.optional(),
  productRef: eventSchema.shape.productRef,
  query: eventSchema.shape.query,
  dwellMs: eventSchema.shape.dwellMs,
});

function weightFor(type: string, dwellMs?: number): number {
  switch (type) {
    case "VIEW":
      return Math.round((0.5 + (Math.min(dwellMs ?? 0, 60_000) / 60_000) * 1.5) * 100) / 100;
    case "CART":
      return 3;
    case "LIKE":
      return 3.5;
    case "DISMISS":
      return 6;
    default:
      return 1.2;
  }
}

/** POST /api/interactions: records views, searches, add-to-cart, saves and "not interested". */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ ok: true, recorded: 0 });
  try {
    const raw = await req.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const body = parsed.data;

    const actor = await resolveActor(req, body.anonId);
    if (!actor.userId && !actor.anonId) return NextResponse.json({ error: "Missing identity" }, { status: 400 });
    const rl = rateLimit(`inter:${actor.userId ?? actor.anonId ?? actor.ip}`, 90, 60_000);
    const rlIp = rateLimit(`inter-ip:${actor.ip}`, 240, 60_000);
    if (!rl.allowed || !rlIp.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const events = body.events ?? (body.type ? [{ type: body.type, productRef: body.productRef, query: body.query, dwellMs: body.dwellMs }] : []);
    if (events.length === 0) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const owner = actor.userId ? { userId: actor.userId, anonId: actor.anonId } : { userId: null, anonId: actor.anonId };
    const rows: { userId: string | null; anonId: string | null; productRef: string | null; category: string | null; storeId: string | null; type: "VIEW" | "SEARCH" | "CART" | "LIKE" | "DISMISS"; weight: number; query: string | null }[] = [];
    for (const e of events) {
      if (e.type === "SEARCH") {
        if (!e.query) continue;
        rows.push({ ...owner, productRef: null, category: null, storeId: null, type: "SEARCH", weight: weightFor("SEARCH"), query: e.query });
        continue;
      }
      if (!e.productRef) continue;
      const listing = await prisma.listing.findUnique({ where: { id: e.productRef }, select: { categoryId: true, storeId: true } });
      if (!listing) continue;
      if (e.type === "LIKE" || e.type === "DISMISS") {
        const who = [...(actor.userId ? [{ userId: actor.userId }] : []), ...(actor.anonId ? [{ anonId: actor.anonId }] : [])];
        await prisma.userInteraction.deleteMany({ where: { OR: who, productRef: e.productRef, type: { in: ["LIKE", "DISMISS"] } } });
      }
      rows.push({ ...owner, productRef: e.productRef, category: listing.categoryId, storeId: listing.storeId, type: e.type, weight: weightFor(e.type, e.dwellMs), query: null });
    }
    if (rows.length) {
      await prisma.userInteraction.createMany({ data: rows });
      invalidateFeed(actor);
    }
    return NextResponse.json({ ok: true, recorded: rows.length });
  } catch (err) {
    console.error("interactions error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not save this right now" }, { status: 500 });
  }
}

/**
 * DELETE /api/interactions: "Reset my recommendations" (no parameters), or take back one
 * save or dismissal (?product=<id>&type=LIKE|DISMISS).
 */
export async function DELETE(req: NextRequest) {
  if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ ok: true, deleted: 0 });
  try {
    const actor = await resolveActor(req);
    if (!actor.userId && !actor.anonId) return NextResponse.json({ error: "Missing identity" }, { status: 400 });
    const rl = rateLimit(`inter-del:${actor.userId ?? actor.anonId}`, 20, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const who = [...(actor.userId ? [{ userId: actor.userId }] : []), ...(actor.anonId ? [{ anonId: actor.anonId }] : [])];
    const product = req.nextUrl.searchParams.get("product");
    const type = req.nextUrl.searchParams.get("type");
    const where: Record<string, unknown> = { OR: who };
    if (product) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(product) || (type !== "LIKE" && type !== "DISMISS")) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
      where.productRef = product;
      where.type = type;
    }
    const res = await prisma.userInteraction.deleteMany({ where });
    invalidateFeed(actor);
    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (err) {
    console.error("interactions delete error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not clear this right now" }, { status: 500 });
  }
}
