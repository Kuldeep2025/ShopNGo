import { NextRequest, NextResponse } from "next/server";
import { salesTrends } from "@/features/analytics";
import { loadAnalyticsForRequest } from "@/features/analytics/server";

/** GET /api/analytics/trends?window=7&horizon=7 – daily series, trend line and forecast. */
export async function GET(req: NextRequest) {
  const loaded = await loadAnalyticsForRequest(req.headers.get("authorization"));
  if (!loaded.ok) return loaded.response;
  const window = Math.min(30, Math.max(2, Number(req.nextUrl.searchParams.get("window")) || 7));
  const horizon = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("horizon")) || 7));
  return NextResponse.json({ ...salesTrends(loaded.transactions, { window, horizon }), source: loaded.source });
}
