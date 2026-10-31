import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";

/**
 * In-app notifications – stored in DB in full implementation.
 * Placeholder returns empty list (no external email/SMS/push).
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req.headers.get("authorization"));
    return NextResponse.json({
      notifications: [],
      message: "In-app notifications only. No email/SMS/push in zero-cost MVP.",
    });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
