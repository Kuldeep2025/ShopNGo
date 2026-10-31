import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { z } from "zod";

const applySchema = z.object({
  vehicleType: z.string().max(50).optional(),
  licenseNo: z.string().max(50).optional(),
  action: z.enum(["save_draft", "submit"]).default("submit"),
});

/**
 * Delivery partner application – similar flow to seller.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ application: null, source: "no-db" });
    }
    const app = await prisma.deliveryApplication.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ application: app });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const body = await req.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const status = parsed.data.action === "submit" ? "SUBMITTED" : "DRAFT";
    const app = await prisma.deliveryApplication.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        vehicleType: parsed.data.vehicleType,
        licenseNo: parsed.data.licenseNo,
        status,
      },
      update: {
        vehicleType: parsed.data.vehicleType,
        licenseNo: parsed.data.licenseNo,
        status,
      },
    });
    if (status === "SUBMITTED") {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "DELIVERY_APPLICATION_SUBMITTED",
          entity: "DeliveryApplication",
          entityId: app.id,
        },
      });
    }
    return NextResponse.json({ application: app });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
