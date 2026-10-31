import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { getFirebaseAdminApp } from "@/lib/auth/firebase-admin";

/**
 * Liveness in development; readiness in production. Never cache health results.
 */
export const runtime = "nodejs";
export async function GET() {
  const production = process.env.NODE_ENV === "production";
  const checks: Record<string, string> = { app: "ok" };
  if (production) {
    const hasAuth = Boolean(
      process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
      process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32 &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.APP_URL && !/localhost|127\.0\.0\.1/.test(process.env.APP_URL)
    );
    checks.auth = hasAuth ? "configured" : "not_ready";
    if (isDatabaseConfigured() && prisma) {
      try {
        await Promise.race([
          prisma.$queryRaw`SELECT 1`,
          new Promise((_, reject) => setTimeout(() => reject(new Error("DB readiness timeout")), 3000)),
        ]);
        checks.database = "ok";
      } catch {
        checks.database = "unavailable";
      }
    } else {
      checks.database = "not_configured";
    }
  } else {
    checks.database = isDatabaseConfigured() ? "configured" : "demo_mode";
    checks.auth = process.env.FIREBASE_ADMIN_PROJECT_ID ? "configured" : "demo_mode";
  }
  if (production && checks.auth === "configured") {
    try {
      checks.auth = (await getFirebaseAdminApp()) ? "configured" : "unavailable";
    } catch {
      checks.auth = "unavailable";
    }
  }
  const ready = !production || (checks.auth === "configured" && checks.database === "ok");
  const body = {
    status: ready ? "ok" : "not_ready",
    service: "ShopNGo",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    checks,
  };

  return NextResponse.json(body, {
    status: ready ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
