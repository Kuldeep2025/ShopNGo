/**
 * Anomaly detection:
 * - robust z-score (rolling median + MAD) on daily revenue – flags spikes and drops
 * - Tukey IQR fences on individual order values – flags unusual orders
 */
import type { Transaction } from "./types";
import type { DailyPoint } from "./trends";
import { round } from "./apriori";

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export type DailyMetric = "revenue" | "orders";
export type DailyAnomaly = {
  date: string;
  metric: DailyMetric;
  value: number;
  revenue: number;
  orders: number;
  score: number;
  kind: "spike" | "drop";
};

/**
 * Robust anomaly detection on a (possibly trending, seasonal) daily series.
 * Each day is compared with the rolling median of its neighbours, and the
 * residuals are scored with the modified z-score 0.6745·(r − median)/MAD.
 * |z| > threshold is anomalous. Detrending stops growth from masking drops.
 */
export function detectDailyAnomalies(
  series: DailyPoint[],
  threshold = 3.5,
  window = 7,
  metric: DailyMetric = "revenue"
): DailyAnomaly[] {
  const values = series.map((p) => p[metric]);
  if (values.length < 3) return [];
  const half = Math.floor(window / 2);
  const baseline = values.map((_, i) => {
    const neighbours = values.slice(Math.max(0, i - half), i + half + 1).filter((__, j) => j !== i - Math.max(0, i - half));
    return median(neighbours);
  });
  const residuals = values.map((v, i) => v - baseline[i]);
  const med = median(residuals);
  const mad = median(residuals.map((r) => Math.abs(r - med)));
  if (mad === 0) return [];
  return series
    .map((p, i) => ({ p, z: (0.6745 * (residuals[i] - med)) / mad }))
    .filter(({ z }) => Math.abs(z) > threshold)
    .map(({ p, z }) => ({
      date: p.date,
      metric,
      value: p[metric],
      revenue: p.revenue,
      orders: p.orders,
      score: round(z, 2),
      kind: z > 0 ? ("spike" as const) : ("drop" as const),
    }));
}

/**
 * Revenue anomalies plus order-volume anomalies. Order counts are much less
 * noisy than revenue, so outages and traffic surges show up clearly there.
 */
export function detectActivityAnomalies(series: DailyPoint[], threshold = 3.5): DailyAnomaly[] {
  return [
    ...detectDailyAnomalies(series, threshold, 7, "revenue"),
    ...detectDailyAnomalies(series, threshold, 7, "orders"),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.metric.localeCompare(b.metric));
}

export type OrderAnomaly = { orderId: string; total: number; createdAt: string; reason: string };

/** Orders whose value lies outside [Q1 − k·IQR, Q3 + k·IQR]. */
export function detectOrderAnomalies(transactions: Transaction[], k = 3): {
  fences: { lower: number; upper: number };
  anomalies: OrderAnomaly[];
} {
  const sorted = transactions.map((t) => t.total).sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = Math.max(0, q1 - k * iqr);
  const upper = q3 + k * iqr;
  const anomalies = transactions
    .filter((t) => t.total > upper || t.total < lower)
    .map((t) => ({
      orderId: t.orderId,
      total: round(t.total, 2),
      createdAt: t.createdAt.toISOString(),
      reason: t.total > upper ? `Order value above ${round(upper, 2)}` : `Order value below ${round(lower, 2)}`,
    }))
    .sort((a, b) => b.total - a.total);
  return { fences: { lower: round(lower, 2), upper: round(upper, 2) }, anomalies };
}
