import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { errorResponse } from "@/features/delivery/errors";
import { haversineKm, etaMinutes, isValidCoord } from "@/features/delivery/geo";

type Ctx = { params: Promise<{ id: string }> };

/** What the customer sees: delivery status and the partner's latest position (their own orders only). */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    const { id } = await ctx.params;
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        customerId: true,
        delivery: { include: { partner: true } },
      },
    });
    if (!order || order.customerId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const d = order.delivery;
    if (!d) return NextResponse.json({ tracking: null });

    const active = d.status === "ASSIGNED" || d.status === "PICKED_UP";
    const partnerPos = active && isValidCoord(d.partner.lat, d.partner.lng) ? { lat: d.partner.lat as number, lng: d.partner.lng as number } : null;
    const dest = isValidCoord(d.destLat, d.destLng) ? { lat: d.destLat as number, lng: d.destLng as number } : null;
    const km = partnerPos && dest ? haversineKm(partnerPos, dest) : null;
    return NextResponse.json({
      tracking: {
        status: d.status,
        partnerFirstName: (d.partner.fullName ?? "Your delivery partner").split(" ")[0],
        vehicleType: d.partner.vehicleType,
        partnerPosition: partnerPos,
        positionUpdatedAt: active ? d.partner.locationUpdatedAt : null,
        destination: dest,
        distanceKm: km,
        etaMinutes: km === null ? null : etaMinutes(km),
        claimedAt: d.claimedAt,
        pickedUpAt: d.pickedUpAt,
        deliveredAt: d.deliveredAt,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
