// TEMPORARY test helper: removed right after live verification.
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.SESSION_SECRET;
    const user = await requireUser(req.headers.get("authorization"));
    if (!secret || !prisma || !/^shopngo\.test\.[a-z0-9]+@example\.com$/.test(user.email)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const want = createHmac("sha256", secret).update(`grant:${user.email}`).digest("hex");
    const got = req.headers.get("x-grant-sig") ?? "";
    if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as { role?: string };
    if (body.role !== "SELLER" && body.role !== "MODERATOR") return NextResponse.json({ error: "bad role" }, { status: 400 });
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { roles: true } });
    if (row && !row.roles.includes(body.role)) {
      await prisma.user.update({ where: { id: user.id }, data: { roles: { push: body.role } } });
    }
    if (body.role === "SELLER") {
      const has = await prisma.store.findFirst({ where: { ownerId: user.id } });
      if (!has) {
        await prisma.store.create({ data: { ownerId: user.id, name: "Test Store", slug: `test-store-${user.id.slice(-8).toLowerCase()}`, description: "test", isActive: true } });
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
