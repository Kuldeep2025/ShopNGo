import { NextRequest, NextResponse } from "next/server";
import { dailySeries, detectActivityAnomalies, detectOrderAnomalies } from "@/features/analytics";
import { loadAnalyticsForRequest } from "@/features/analytics/server";

/** GET /api/analytics/anomalies – unusual revenue days and unusual order values. */
export async function GET(req: NextRequest) {
  const loaded = await loadAnalyticsForRequest(req.headers.get("authorization"));
  if (!loaded.ok) return loaded.response;
  const threshold = Math.min(10, Math.max(1, Number(req.nextUrl.searchParams.get("threshold")) || 3.5));
  const daily = detectActivityAnomalies(dailySeries(loaded.transactions), threshold);
  const orders = detectOrderAnomalies(loaded.transactions);
  return NextResponse.json({ daily, orders, source: loaded.source });
}
