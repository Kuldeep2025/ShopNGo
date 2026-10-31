import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

/**
 * GET /api/auth/session
 * Returns the current internal user (or null).
 * Client sends Firebase ID token as Authorization: Bearer <token>
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const user = await getSessionUser(authHeader);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Never return secrets or internal-only fields
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
      },
    });
  } catch (err) {
    console.error("session error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Unable to resolve session" },
      { status: 500 }
    );
  }
}
