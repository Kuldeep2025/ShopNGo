import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { z } from "zod";

const sendSchema = z.object({
  body: z.string().min(1).max(2000),
  storeId: z.string().optional(),
  orderId: z.string().optional(),
});

/**
 * GET  /api/messages?storeId=|&orderId=
 * POST /api/messages
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ messages: [], source: "no-db" });
    }
    const storeId = req.nextUrl.searchParams.get("storeId");
    const orderId = req.nextUrl.searchParams.get("orderId");

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(storeId ? [{ storeId }] : []),
        ],
        ...(orderId ? { orderId } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json({ messages });
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
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        userId: user.id,
        body: parsed.data.body,
        storeId: parsed.data.storeId,
        orderId: parsed.data.orderId,
      },
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
