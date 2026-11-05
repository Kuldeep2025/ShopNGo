import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import type { Actor } from "./data";

const ANON_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function cleanAnonId(v: unknown): string | null {
  return typeof v === "string" && ANON_RE.test(v) ? v : null;
}

/** Who is asking: the signed-in user (Bearer token), and the guest id from the browser if any. */
export async function resolveActor(req: NextRequest, bodyAnon?: unknown): Promise<Actor & { ip: string }> {
  let userId: string | null = null;
  try {
    const user = await getSessionUser(req.headers.get("authorization"));
    if (user && user.id !== "ephemeral") userId = user.id;
  } catch {
    userId = null;
  }
  const anonId =
    cleanAnonId(bodyAnon) ?? cleanAnonId(req.headers.get("x-anon-id")) ?? cleanAnonId(req.nextUrl.searchParams.get("anon"));
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || req.headers.get("x-real-ip") || "unknown";
  return { userId, anonId, ip };
}
