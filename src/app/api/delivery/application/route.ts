import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { errorResponse } from "@/features/delivery/errors";
import { z } from "zod";
import { normaliseIndianPhone } from "@/features/delivery/phone";

const applySchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  phone: z
    .string()
    .trim()
    .max(20)
    .transform((v, ctx) => {
      if (v === "") return undefined;
      const n = normaliseIndianPhone(v);
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid 10-digit Indian mobile number, for example 98765 43210." });
        return z.NEVER;
      }
      return n;
    })
    .optional(),
  city: z.string().trim().min(2).max(60).optional(),
  vehicleType: z.string().trim().max(50).optional(),
  licenseNo: z.string().trim().max(50).optional(),
  action: z.enum(["save_draft", "submit"]).default("submit"),
});

/**
 * Delivery partner application. Anyone signed in can apply; a complete application is
 * approved straight away (set DELIVERY_AUTO_APPROVE=false to require a moderator instead).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ application: null, partner: null, source: "no-db" });
    }
    const [application, partner] = await Promise.all([
      prisma.deliveryApplication.findUnique({ where: { userId: user.id } }),
      prisma.deliveryPartner.findUnique({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ application, partner });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first ? `${first.path.join(".") || "Form"}: ${first.message}` : "Validation failed" },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const existing = await prisma.deliveryApplication.findUnique({ where: { userId: user.id } });
    if (existing && (existing.status === "APPROVED" || existing.status === "SUSPENDED")) {
      return NextResponse.json({ error: `Your application is already ${existing.status.toLowerCase()}.` }, { status: 409 });
    }
    if (d.action === "submit" && (!d.fullName || !d.phone || !d.city || !d.vehicleType)) {
      return NextResponse.json(
        { error: "Please fill in your name, phone number, city and vehicle type." },
        { status: 400 }
      );
    }

    const autoApprove = process.env.DELIVERY_AUTO_APPROVE !== "false";
    const submitting = d.action === "submit";
    const status = !submitting ? "DRAFT" : autoApprove ? "APPROVED" : "SUBMITTED";
    const fields = {
      fullName: d.fullName,
      phone: d.phone,
      city: d.city,
      vehicleType: d.vehicleType,
      licenseNo: d.licenseNo,
    };

    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.deliveryApplication.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...fields, status },
        update: { ...fields, status, ...(status === "APPROVED" ? { reviewedAt: new Date(), decisionNote: "Approved automatically" } : {}) },
      });
      let partner = null;
      if (status === "APPROVED") {
        partner = await tx.deliveryPartner.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...fields },
          update: { ...fields },
        });
        const current = await tx.user.findUnique({ where: { id: user.id }, select: { roles: true } });
        if (current && !current.roles.includes("DELIVERY_PARTNER")) {
          await tx.user.update({ where: { id: user.id }, data: { roles: { push: "DELIVERY_PARTNER" } } });
        }
      }
      if (submitting) {
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: status === "APPROVED" ? "DELIVERY_PARTNER_APPROVED" : "DELIVERY_APPLICATION_SUBMITTED",
            entity: "DeliveryApplication",
            entityId: application.id,
          },
        });
      }
      return { application, partner };
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
