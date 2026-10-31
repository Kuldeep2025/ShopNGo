import { NextRequest, NextResponse } from "next/server";
import { buildInsights } from "@/features/analytics";
import { loadAnalyticsForRequest } from "@/features/analytics/server";

/** GET /api/analytics/insights – every data mining result in one response. */
export async function GET(req: NextRequest) {
  const loaded = await loadAnalyticsForRequest(req.headers.get("authorization"));
  if (!loaded.ok) return loaded.response;
  return NextResponse.json({ ...buildInsights(loaded.transactions), source: loaded.source });
}
