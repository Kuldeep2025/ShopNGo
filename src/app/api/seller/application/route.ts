import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  submitApplicationSchema,
  canCustomerTransition,
} from "@/features/sellers/application";

/**
 * GET /api/seller/application – current user's application (or null)
 * POST /api/seller/application – create/update draft or submit
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ application: null, source: "no-db" });
    }

    const app = await prisma.sellerApplication.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({ application: app });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const action = body.action as "save_draft" | "submit";

    const parsed = submitApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.sellerApplication.findUnique({
      where: { userId: user.id },
    });

    if (action === "submit") {
      // Must be DRAFT or new
      if (existing && !canCustomerTransition(existing.status as never, "SUBMITTED")) {
        return NextResponse.json(
          { error: `Cannot submit from status ${existing.status}` },
          { status: 409 }
        );
      }

      const app = await prisma.sellerApplication.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          businessName: parsed.data.businessName,
          description: parsed.data.description,
          status: "SUBMITTED",
        },
        update: {
          businessName: parsed.data.businessName,
          description: parsed.data.description,
          status: "SUBMITTED",
        },
      });

      // Audit
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "SELLER_APPLICATION_SUBMITTED",
          entity: "SellerApplication",
          entityId: app.id,
          meta: { businessName: parsed.data.businessName },
        },
      });

      return NextResponse.json({ application: app });
    }

    // save_draft
    if (existing && existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      return NextResponse.json(
        { error: `Cannot edit draft while status is ${existing.status}` },
        { status: 409 }
      );
    }

    const app = await prisma.sellerApplication.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        businessName: parsed.data.businessName,
        description: parsed.data.description,
        status: "DRAFT",
      },
      update: {
        businessName: parsed.data.businessName,
        description: parsed.data.description,
        status: existing?.status === "REJECTED" ? "DRAFT" : "DRAFT",
      },
    });

    return NextResponse.json({ application: app });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("seller application error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
