/**
 * Customer segmentation: RFM (Recency, Frequency, Monetary) scoring
 * plus k-means clustering on log-scaled RFM features.
 */
import type { Transaction } from "./types";
import { kMeans, standardize } from "./kmeans";
import { round } from "./apriori";

export type CustomerRfm = {
  customerId: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  rScore: number; // 1–5, 5 = most recent
  fScore: number; // 1–5, 5 = most frequent
  mScore: number; // 1–5, 5 = highest spend
  segment: RfmSegment;
  cluster: number;
};

export type RfmSegment =
  | "Champions"
  | "Loyal customers"
  | "Potential loyalists"
  | "New customers"
  | "At risk"
  | "Hibernating";

export type ClusterSummary = {
  cluster: number;
  label: string;
  size: number;
  avgRecencyDays: number;
  avgFrequency: number;
  avgMonetary: number;
};

const DAY_MS = 86_400_000;

export function computeRfm(transactions: Transaction[], asOf: Date = new Date()) {
  const byCustomer = new Map<string, { last: number; count: number; spend: number }>();
  for (const t of transactions) {
    const e = byCustomer.get(t.customerId) ?? { last: 0, count: 0, spend: 0 };
    e.last = Math.max(e.last, t.createdAt.getTime());
    e.count += 1;
    e.spend += t.total;
    byCustomer.set(t.customerId, e);
  }
  return [...byCustomer.entries()].map(([customerId, e]) => ({
    customerId,
    recencyDays: Math.max(0, Math.floor((asOf.getTime() - e.last) / DAY_MS)),
    frequency: e.count,
    monetary: round(e.spend, 2),
  }));
}

/** Quintile score 1–5 based on rank (ties share the lower rank). */
function quintileScores(values: number[], higherIsBetter: boolean): number[] {
  const n = values.length;
  if (n === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    const rank = sorted.indexOf(v); // first position = ties grouped
    const pct = n === 1 ? 1 : rank / (n - 1);
    const score = Math.min(5, Math.floor(pct * 5) + 1);
    return higherIsBetter ? score : 6 - score;
  });
}

export function rfmSegment(r: number, f: number, m: number): RfmSegment {
  if (r >= 4 && f >= 4 && m >= 4) return "Champions";
  if (f >= 4 && r >= 3) return "Loyal customers";
  if (r >= 4 && f <= 1) return "New customers";
  if (r >= 3) return "Potential loyalists";
  if (f >= 3 || m >= 4) return "At risk";
  return "Hibernating";
}

function clusterLabel(avgR: number, avgF: number, avgM: number, overall: { r: number; f: number; m: number }) {
  const recent = avgR <= overall.r;
  const frequent = avgF >= overall.f;
  const big = avgM >= overall.m;
  if (recent && frequent && big) return "High-value active";
  if (recent && !frequent) return "Recent / occasional";
  if (!recent && (frequent || big)) return "Lapsing high-value";
  if (!recent) return "Dormant low-value";
  return "Steady mid-value";
}

export function segmentCustomers(
  transactions: Transaction[],
  options: { k?: number; asOf?: Date; seed?: number } = {}
): { customers: CustomerRfm[]; clusters: ClusterSummary[] } {
  const { k = 4, asOf = new Date(), seed = 42 } = options;
  const base = computeRfm(transactions, asOf);
  if (base.length === 0) return { customers: [], clusters: [] };

  const rS = quintileScores(base.map((c) => c.recencyDays), false);
  const fS = quintileScores(base.map((c) => c.frequency), true);
  const mS = quintileScores(base.map((c) => c.monetary), true);

  // log1p tames heavy-tailed spend/frequency before standardising.
  const features = base.map((c) => [Math.log1p(c.recencyDays), Math.log1p(c.frequency), Math.log1p(c.monetary)]);
  const { rows } = standardize(features);
  const km = kMeans(rows, k, seed);

  const customers: CustomerRfm[] = base.map((c, i) => ({
    ...c,
    rScore: rS[i],
    fScore: fS[i],
    mScore: mS[i],
    segment: rfmSegment(rS[i], fS[i], mS[i]),
    cluster: km.labels[i],
  }));

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const overall = {
    r: avg(customers.map((c) => c.recencyDays)),
    f: avg(customers.map((c) => c.frequency)),
    m: avg(customers.map((c) => c.monetary)),
  };
  const clusterIds = [...new Set(km.labels)].sort((a, b) => a - b);
  const clusters = clusterIds.map((id) => {
    const members = customers.filter((c) => c.cluster === id);
    const r = avg(members.map((c) => c.recencyDays));
    const f = avg(members.map((c) => c.frequency));
    const m = avg(members.map((c) => c.monetary));
    return {
      cluster: id,
      label: clusterLabel(r, f, m, overall),
      size: members.length,
      avgRecencyDays: round(r, 1),
      avgFrequency: round(f, 2),
      avgMonetary: round(m, 2),
    };
  });

  return { customers, clusters };
}
