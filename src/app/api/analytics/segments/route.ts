import { NextRequest, NextResponse } from "next/server";
import { segmentCustomers } from "@/features/analytics";
import { loadAnalyticsForRequest } from "@/features/analytics/server";

/** GET /api/analytics/segments?k=4 – RFM scores + k-means customer clusters. */
export async function GET(req: NextRequest) {
  const loaded = await loadAnalyticsForRequest(req.headers.get("authorization"));
  if (!loaded.ok) return loaded.response;
  const k = Math.min(8, Math.max(2, Number(req.nextUrl.searchParams.get("k")) || 4));
  const last = loaded.transactions.reduce((m, t) => Math.max(m, t.createdAt.getTime()), 0);
  const { customers, clusters } = segmentCustomers(loaded.transactions, {
    k,
    asOf: last ? new Date(last) : new Date(),
  });
  return NextResponse.json({ k, clusters, customers: customers.slice(0, 500), totalCustomers: customers.length, source: loaded.source });
}
