import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rateLimit";
import { isAiAvatarId } from "@/features/avatars/catalog";
import { validateAvatarDataUrl } from "@/features/avatars/validate";
import { readAvatar, writeAiAvatar, writeImage } from "@/features/avatars/store";

/**
 * GET /api/profile/avatar  – own picture and chosen AI avatar
 * PUT /api/profile/avatar  – { image?: dataUrl | null, aiAvatar?: id }
 */
function fail(err: unknown) {
  const status = (err as Error & { status?: number }).status ?? 500;
  if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  console.error("avatar error:", err instanceof Error ? err.message : "unknown");
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || user.id === "ephemeral") {
      return NextResponse.json({ error: "Storage not available" }, { status: 503 });
    }
    const row = await readAvatar(user.id);
    return NextResponse.json({ image: row.image, aiAvatar: isAiAvatarId(row.aiAvatar) ? row.aiAvatar : null });
  } catch (err) {
    return fail(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || user.id === "ephemeral") {
      return NextResponse.json({ error: "Storage not available" }, { status: 503 });
    }
    if (!rateLimit(`avatar:${user.id}`, 20, 60_000).allowed) {
      return NextResponse.json({ error: "Too many changes. Please wait a minute." }, { status: 429 });
    }
    let body: { image?: unknown; aiAvatar?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (body.image === undefined && body.aiAvatar === undefined) {
      return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
    }
    if (body.aiAvatar !== undefined && !isAiAvatarId(body.aiAvatar)) {
      return NextResponse.json({ error: "Unknown AI avatar" }, { status: 400 });
    }
    if (body.image !== undefined && body.image !== null) {
      const check = validateAvatarDataUrl(body.image);
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    }
    if (body.image !== undefined) await writeImage(user.id, body.image as string | null);
    if (body.aiAvatar !== undefined) await writeAiAvatar(user.id, body.aiAvatar as string);
    const row = await readAvatar(user.id);
    return NextResponse.json({ image: row.image, aiAvatar: isAiAvatarId(row.aiAvatar) ? row.aiAvatar : null });
  } catch (err) {
    return fail(err);
  }
}
