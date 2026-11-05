import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { errorResponse } from "@/features/delivery/errors";
import { isValidCoord } from "@/features/delivery/geo";

/** The partner's phone posts its position here while they are online. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["DELIVERY_PARTNER"]);
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    const body = (await req.json().catch(() => ({}))) as { lat?: unknown; lng?: unknown; accuracy?: unknown };
    if (!isValidCoord(body.lat, body.lng)) {
      return NextResponse.json({ error: "A valid latitude and longitude are required" }, { status: 400 });
    }
    const accuracy = typeof body.accuracy === "number" && Number.isFinite(body.accuracy) ? body.accuracy : null;
    const partner = await prisma.deliveryPartner.update({
      where: { userId: user.id },
      data: { lat: body.lat as number, lng: body.lng as number, accuracy, locationUpdatedAt: new Date() },
      select: { lat: true, lng: true, locationUpdatedAt: true },
    });
    return NextResponse.json({ location: partner });
  } catch (err) {
    return errorResponse(err);
  }
}
