import { NextResponse } from "next/server";
import { getSiteStats } from "@/features/stats/siteStats";

export const dynamic = "force-dynamic";

/** GET /api/stats – public totals only, cached for a few seconds. */
export async function GET() {
  const stats = await getSiteStats();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30" },
  });
}
