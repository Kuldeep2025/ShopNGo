import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { updateProfileSchema } from "@/features/profile/schema";

/**
 * GET  /api/profile – own profile
 * PATCH /api/profile – update displayName / phone / bio
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({
        profile: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          roles: user.roles,
        },
        source: "session-only",
      });
    }

    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        photoUrl: true,
        roles: true,
        profile: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ profile: full });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Update User.displayName + Profile.phone/bio
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: data.displayName !== undefined ? data.displayName : undefined,
        },
        select: { id: true, email: true, displayName: true, roles: true },
      }),
      prisma.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          phone: data.phone ?? null,
          bio: data.bio ?? null,
        },
        update: {
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.bio !== undefined ? { bio: data.bio } : {}),
        },
      }),
    ]);

    // Never log PII
    return NextResponse.json({ profile: updatedUser });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("profile update error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
