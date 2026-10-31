import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import {
  moderateApplicationSchema,
  canModeratorTransition,
} from "@/features/sellers/application";

/**
 * GET /api/moderator/applications – list pending applications
 * PATCH /api/moderator/applications – approve / reject / suspend
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(req.headers.get("authorization"), ["MODERATOR", "ADMIN"]);

    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ applications: [], source: "no-db" });
    }

    const status = req.nextUrl.searchParams.get("status") ?? "SUBMITTED";

    const apps = await prisma.sellerApplication.findMany({
      where: {
        status: status as never,
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ applications: apps });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (status === 403) {
      return NextResponse.json({ error: "Forbidden – moderator role required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const moderator = await requireRole(req.headers.get("authorization"), [
      "MODERATOR",
      "ADMIN",
    ]);

    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { applicationId } = body;
    if (!applicationId || typeof applicationId !== "string") {
      return NextResponse.json(
        { error: "applicationId is required" },
        { status: 400 }
      );
    }

    const parsed = moderateApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const app = await prisma.sellerApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (!canModeratorTransition(app.status as never, parsed.data.decision)) {
      return NextResponse.json(
        { error: `Cannot transition from ${app.status} to ${parsed.data.decision}` },
        { status: 409 }
      );
    }

    // Perform decision in a transaction: update application + optionally create store + audit
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.sellerApplication.update({
        where: { id: applicationId },
        data: {
          status: parsed.data.decision,
          decisionNote: parsed.data.reason,
          reviewedBy: moderator.id,
          reviewedAt: new Date(),
        },
      });

      // On APPROVED → grant SELLER role + create/activate store
      if (parsed.data.decision === "APPROVED") {
        await tx.user.update({
          where: { id: app.userId },
          data: {
            roles: { push: "SELLER" },
          },
        });

        // Create store if none exists
        const existingStore = await tx.store.findFirst({
          where: { ownerId: app.userId },
        });
        if (!existingStore) {
          const slugBase =
            (app.businessName ?? "store")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 40) || "store";
          const slug = `${slugBase}-${app.userId.slice(-6)}`;

          await tx.store.create({
            data: {
              ownerId: app.userId,
              name: app.businessName ?? "My Store",
              slug,
              description: app.description,
              isActive: true,
            },
          });
        } else {
          await tx.store.update({
            where: { id: existingStore.id },
            data: { isActive: true },
          });
        }
      }

      // On REJECTED or SUSPENDED → deactivate any store
      if (parsed.data.decision === "REJECTED" || parsed.data.decision === "SUSPENDED") {
        await tx.store.updateMany({
          where: { ownerId: app.userId },
          data: { isActive: false },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: moderator.id,
          action: `SELLER_APPLICATION_${parsed.data.decision}`,
          entity: "SellerApplication",
          entityId: applicationId,
          meta: {
            reason: parsed.data.reason,
            previousStatus: app.status,
            businessName: app.businessName,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ application: result });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (status === 403) {
      return NextResponse.json({ error: "Forbidden – moderator role required" }, { status: 403 });
    }
    console.error("moderator decision error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
