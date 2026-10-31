/**
 * Sales trend and time-series analysis:
 * daily aggregation, moving average, least-squares trend line,
 * week-over-week growth and a Holt (double exponential smoothing) forecast.
 */
import type { Transaction } from "./types";
import { round } from "./apriori";

export type DailyPoint = { date: string; revenue: number; orders: number; movingAvg: number | null };

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Revenue and order counts per UTC day, with gaps filled by zeros. */
export function dailySeries(transactions: Transaction[], window = 7): DailyPoint[] {
  if (transactions.length === 0) return [];
  const byDay = new Map<string, { revenue: number; orders: number }>();
  let min = Infinity;
  let max = -Infinity;
  for (const t of transactions) {
    const day = isoDay(t.createdAt);
    const e = byDay.get(day) ?? { revenue: 0, orders: 0 };
    e.revenue += t.total;
    e.orders += 1;
    byDay.set(day, e);
    const ts = Date.parse(day);
    min = Math.min(min, ts);
    max = Math.max(max, ts);
  }
  const points: DailyPoint[] = [];
  for (let ts = min; ts <= max; ts += DAY_MS) {
    const day = isoDay(new Date(ts));
    const e = byDay.get(day) ?? { revenue: 0, orders: 0 };
    points.push({ date: day, revenue: round(e.revenue, 2), orders: e.orders, movingAvg: null });
  }
  const ma = movingAverage(points.map((p) => p.revenue), window);
  return points.map((p, i) => ({ ...p, movingAvg: ma[i] }));
}

export function movingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return round(slice.reduce((a, b) => a + b, 0) / window, 2);
  });
}

/** Ordinary least squares y = intercept + slope·x over x = 0..n-1. */
export function linearTrend(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - xMean) * (values[i] - yMean);
    sxx += (i - xMean) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;
  const ssTot = values.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = values.reduce((s, y, i) => s + (y - (intercept + slope * i)) ** 2, 0);
  return { slope: round(slope, 2), intercept: round(intercept, 2), r2: ssTot === 0 ? 0 : round(1 - ssRes / ssTot) };
}

/** Holt's linear method; returns `horizon` future values (never negative). */
export function holtForecast(values: number[], horizon = 7, alpha = 0.4, beta = 0.2): number[] {
  if (values.length === 0) return [];
  let level = values[0];
  let trend = values.length > 1 ? values[1] - values[0] : 0;
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  return Array.from({ length: horizon }, (_, h) => round(Math.max(0, level + (h + 1) * trend), 2));
}

/** Revenue per product, best sellers first. */
export function topProducts(transactions: Transaction[], limit = 5) {
  const m = new Map<string, { listingId: string; title: string; units: number; revenue: number }>();
  for (const t of transactions) {
    for (const it of t.items) {
      const e = m.get(it.listingId) ?? { listingId: it.listingId, title: it.title, units: 0, revenue: 0 };
      e.units += it.quantity;
      e.revenue += it.quantity * it.unitPrice;
      m.set(it.listingId, e);
    }
  }
  return [...m.values()]
    .map((e) => ({ ...e, revenue: round(e.revenue, 2) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function salesTrends(transactions: Transaction[], options: { window?: number; horizon?: number } = {}) {
  const { window = 7, horizon = 7 } = options;
  const series = dailySeries(transactions, window);
  const revenue = series.map((p) => p.revenue);
  const last7 = revenue.slice(-7).reduce((a, b) => a + b, 0);
  const prev7 = revenue.slice(-14, -7).reduce((a, b) => a + b, 0);
  const lastDate = series.length ? Date.parse(series[series.length - 1].date) : Date.now();
  const forecast = holtForecast(revenue, horizon).map((value, i) => ({
    date: isoDay(new Date(lastDate + (i + 1) * DAY_MS)),
    revenue: value,
  }));
  const totalRevenue = revenue.reduce((a, b) => a + b, 0);
  return {
    series,
    trend: linearTrend(revenue),
    weekOverWeekGrowth: prev7 > 0 ? round((last7 - prev7) / prev7) : null,
    forecast,
    totals: {
      revenue: round(totalRevenue, 2),
      orders: transactions.length,
      averageOrderValue: transactions.length ? round(totalRevenue / transactions.length, 2) : 0,
    },
    topProducts: topProducts(transactions),
  };
}
