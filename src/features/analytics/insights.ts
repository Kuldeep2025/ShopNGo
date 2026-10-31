/** One-call summary combining every mining module (used by the dashboard). */
import { associationRules } from "./apriori";
import { segmentCustomers } from "./rfm";
import { salesTrends } from "./trends";
import { detectActivityAnomalies, detectOrderAnomalies } from "./anomaly";
import { popularItems } from "./recommend";
import { toBaskets } from "./baskets";
import type { Transaction } from "./types";

export function buildInsights(transactions: Transaction[], asOf?: Date) {
  const lastOrder = transactions.reduce((m, t) => Math.max(m, t.createdAt.getTime()), 0);
  const referenceDate = asOf ?? (lastOrder ? new Date(lastOrder) : new Date());
  const titles = new Map<string, string>();
  for (const t of transactions) for (const it of t.items) titles.set(it.listingId, it.title);
  const name = (ids: string[]) => ids.map((id) => titles.get(id) ?? id);

  const rules = associationRules(toBaskets(transactions), { minSupport: 0.03, minConfidence: 0.25 })
    .filter((r) => r.lift > 1)
    .slice(0, 10)
    .map((r) => ({ ...r, antecedentTitles: name(r.antecedent), consequentTitles: name(r.consequent) }));

  const segmentation = segmentCustomers(transactions, { asOf: referenceDate });
  const segmentCounts: Record<string, number> = {};
  for (const c of segmentation.customers) segmentCounts[c.segment] = (segmentCounts[c.segment] ?? 0) + 1;

  const trends = salesTrends(transactions);
  return {
    generatedAt: referenceDate.toISOString(),
    totals: trends.totals,
    associationRules: rules,
    segments: { clusters: segmentation.clusters, rfmSegments: segmentCounts },
    trends: {
      trend: trends.trend,
      weekOverWeekGrowth: trends.weekOverWeekGrowth,
      series: trends.series,
      forecast: trends.forecast,
      topProducts: trends.topProducts,
    },
    anomalies: {
      daily: detectActivityAnomalies(trends.series),
      orders: detectOrderAnomalies(transactions).anomalies.slice(0, 10),
    },
    popular: popularItems(transactions).map((p) => ({ ...p, title: titles.get(p.listingId) ?? p.listingId })),
  };
}

export type Insights = ReturnType<typeof buildInsights>;
