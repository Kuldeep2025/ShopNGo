import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { errorResponse } from "@/features/delivery/errors";
import { areaText, addressText, haversineKm, etaMinutes, isValidCoord } from "@/features/delivery/geo";

type Addr = Record<string, unknown> | null;

/** Open orders a partner can take, plus their own active and recent deliveries. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["DELIVERY_PARTNER"]);
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
    if (!partner) return NextResponse.json({ error: "No delivery profile" }, { status: 404 });

    const here = isValidCoord(partner.lat, partner.lng) ? { lat: partner.lat as number, lng: partner.lng as number } : null;

    const [open, mine] = await Promise.all([
      partner.isOnline
        ? prisma.order.findMany({
            where: { status: { in: ["PAID", "PROCESSING", "SHIPPED"] }, delivery: null },
            orderBy: { createdAt: "asc" },
            take: 30,
            select: {
              id: true, status: true, totalAmount: true, currency: true, createdAt: true, shippingAddress: true,
              items: { select: { quantity: true } },
            },
          })
        : Promise.resolve([]),
      prisma.delivery.findMany({
        where: { partnerId: partner.id },
        orderBy: { updatedAt: "desc" },
        take: 30,
        include: {
          order: { select: { id: true, status: true, totalAmount: true, currency: true, shippingAddress: true, items: { select: { quantity: true } } } },
        },
      }),
    ]);

    const available = open.map((o) => {
      const a = o.shippingAddress as Addr;
      let km: number | null = null;
      if (here && a && isValidCoord(a.lat, a.lng)) km = haversineKm(here, { lat: a.lat as number, lng: a.lng as number });
      return {
        orderId: o.id,
        shortId: o.id.slice(-8),
        total: o.totalAmount.toString(),
        currency: o.currency,
        itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
        area: areaText(a),
        distanceKm: km,
        etaMinutes: km === null ? null : etaMinutes(km),
        placedAt: o.createdAt,
      };
    });

    const deliveries = mine.map((d) => {
      const a = d.order.shippingAddress as Addr;
      const dest = isValidCoord(d.destLat, d.destLng) ? { lat: d.destLat as number, lng: d.destLng as number } : null;
      const km = here && dest ? haversineKm(here, dest) : null;
      const active = d.status === "ASSIGNED" || d.status === "PICKED_UP";
      return {
        id: d.id,
        orderId: d.orderId,
        shortId: d.orderId.slice(-8),
        status: d.status,
        total: d.order.totalAmount.toString(),
        currency: d.order.currency,
        itemCount: d.order.items.reduce((n, i) => n + i.quantity, 0),
        // The full address is shown only for deliveries the partner has taken.
        address: active ? addressText(a) : areaText(a),
        dest,
        distanceKm: active ? km : null,
        etaMinutes: active && km !== null ? etaMinutes(km) : null,
        claimedAt: d.claimedAt,
        deliveredAt: d.deliveredAt,
      };
    });

    return NextResponse.json({
      partner: { isOnline: partner.isOnline, lat: partner.lat, lng: partner.lng, locationUpdatedAt: partner.locationUpdatedAt, deliveriesDone: partner.deliveriesDone, fullName: partner.fullName, vehicleType: partner.vehicleType },
      available,
      deliveries,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
