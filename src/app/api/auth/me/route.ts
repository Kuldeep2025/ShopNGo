import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";

/**
 * GET /api/auth/me
 * Protected – returns the authenticated internal user.
 * 401 if no valid token.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
    });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (status === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("me error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
