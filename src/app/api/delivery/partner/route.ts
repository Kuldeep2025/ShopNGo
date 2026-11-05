import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { errorResponse } from "@/features/delivery/errors";
import { z } from "zod";

/** GET the partner profile; PATCH to go online or offline. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["DELIVERY_PARTNER"]);
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
    if (!partner) return NextResponse.json({ error: "No delivery profile" }, { status: 404 });
    return NextResponse.json({ partner });
  } catch (err) {
    return errorResponse(err);
  }
}

const patchSchema = z.object({ isOnline: z.boolean() });

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["DELIVERY_PARTNER"]);
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "isOnline must be true or false" }, { status: 400 });
    const partner = await prisma.deliveryPartner.update({
      where: { userId: user.id },
      data: { isOnline: parsed.data.isOnline },
    });
    return NextResponse.json({ partner });
  } catch (err) {
    return errorResponse(err);
  }
}
