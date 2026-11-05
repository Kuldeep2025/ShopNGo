import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";

/**
 * Legacy endpoint, kept only so old clients get a clear answer. Messaging now lives under
 * /api/conversations, which enforces who may write and when.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req.headers.get("authorization"));
    return NextResponse.json({ messages: [], moved: "/api/conversations" });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "This endpoint has moved. Use the Messages page instead." }, { status: 410 });
}
