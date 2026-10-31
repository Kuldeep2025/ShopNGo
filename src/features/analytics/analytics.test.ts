import { describe, it, expect } from "vitest";
import {
  associationRules,
  frequentItemsets,
  frequentlyBoughtTogether,
  kMeans,
  standardize,
  segmentCustomers,
  rfmSegment,
  similarItems,
  recommendForCustomer,
  popularItems,
  movingAverage,
  linearTrend,
  holtForecast,
  dailySeries,
  salesTrends,
  detectDailyAnomalies,
  detectOrderAnomalies,
  generateSampleTransactions,
  buildInsights,
  toBaskets,
  type Transaction,
} from "./index";

const tx = (id: string, customer: string, day: number, items: [string, number][]): Transaction => ({
  orderId: id,
  customerId: customer,
  createdAt: new Date(Date.UTC(2026, 9, 1 + day, 10)),
  total: items.reduce((s, [, p]) => s + p, 0),
  items: items.map(([listingId, unitPrice]) => ({ listingId, title: listingId, quantity: 1, unitPrice })),
});

describe("apriori", () => {
  const baskets = [
    ["bread", "milk"],
    ["bread", "diaper", "beer", "eggs"],
    ["milk", "diaper", "beer", "cola"],
    ["bread", "milk", "diaper", "beer"],
    ["bread", "milk", "diaper", "cola"],
  ];

  it("finds frequent itemsets with correct support", () => {
    const sets = frequentItemsets(baskets, 0.6, 3);
    const find = (items: string[]) => sets.find((s) => s.items.join() === [...items].sort().join());
    expect(find(["bread"])?.support).toBeCloseTo(0.8);
    expect(find(["beer", "diaper"])?.support).toBeCloseTo(0.6);
    expect(find(["eggs"])).toBeUndefined();
  });

  it("computes confidence and lift for rules", () => {
    const rules = associationRules(baskets, { minSupport: 0.6, minConfidence: 0.5 });
    const beerToDiaper = rules.find((r) => r.antecedent.join() === "beer" && r.consequent.join() === "diaper");
    expect(beerToDiaper?.confidence).toBe(1);
    expect(beerToDiaper?.lift).toBeCloseTo(1.25);
    // sorted by lift descending
    for (let i = 1; i < rules.length; i++) expect(rules[i - 1].lift).toBeGreaterThanOrEqual(rules[i].lift);
  });

  it("returns frequently-bought-together items for one product", () => {
    const fbt = frequentlyBoughtTogether(baskets, "beer", 3, { minSupport: 0.4, minConfidence: 0.3 });
    expect(fbt[0].consequent).toEqual(["diaper"]);
    expect(fbt.every((r) => r.lift > 1)).toBe(true);
  });

  it("handles empty input", () => {
    expect(associationRules([])).toEqual([]);
  });
});

describe("k-means", () => {
  it("separates two obvious clusters deterministically", () => {
    const pts = [[0, 0], [0.1, 0.2], [0.2, 0.1], [10, 10], [10.1, 9.9], [9.8, 10.2]];
    const a = kMeans(pts, 2, 1);
    const b = kMeans(pts, 2, 1);
    expect(a.labels).toEqual(b.labels);
    expect(new Set(a.labels.slice(0, 3)).size).toBe(1);
    expect(new Set(a.labels.slice(3)).size).toBe(1);
    expect(a.labels[0]).not.toBe(a.labels[3]);
  });

  it("standardises columns to mean 0", () => {
    const { rows } = standardize([[1, 5], [3, 5], [5, 5]]);
    expect(rows.map((r) => r[0]).reduce((s, v) => s + v, 0)).toBeCloseTo(0);
    expect(rows.every((r) => r[1] === 0)).toBe(true);
  });
});

describe("RFM segmentation", () => {
  it("labels segments from scores", () => {
    expect(rfmSegment(5, 5, 5)).toBe("Champions");
    expect(rfmSegment(5, 1, 2)).toBe("New customers");
    expect(rfmSegment(1, 1, 1)).toBe("Hibernating");
  });

  it("scores and clusters customers", () => {
    const transactions = [
      tx("1", "a", 29, [["x", 500]]),
      tx("2", "a", 28, [["y", 500]]),
      tx("3", "a", 27, [["x", 500]]),
      tx("4", "b", 0, [["x", 50]]),
      tx("5", "c", 15, [["y", 100]]),
    ];
    const { customers, clusters } = segmentCustomers(transactions, { k: 2, asOf: new Date(Date.UTC(2026, 9, 31)) });
    const a = customers.find((c) => c.customerId === "a")!;
    const b = customers.find((c) => c.customerId === "b")!;
    expect(a.frequency).toBe(3);
    expect(a.monetary).toBe(1500);
    expect(a.rScore).toBeGreaterThan(b.rScore);
    expect(clusters.reduce((s, c) => s + c.size, 0)).toBe(3);
  });
});

describe("recommendations", () => {
  const transactions = [
    tx("1", "a", 0, [["x", 1], ["y", 1]]),
    tx("2", "b", 0, [["x", 1], ["y", 1]]),
    tx("3", "c", 0, [["x", 1], ["z", 1]]),
    tx("4", "d", 0, [["y", 1]]),
  ];

  it("ranks similar items by cosine similarity", () => {
    const sim = similarItems(transactions, "x");
    expect(sim[0].listingId).toBe("y");
    expect(sim.find((s) => s.listingId === "z")).toBeDefined();
  });

  it("recommends unseen items for a customer and falls back to popularity", () => {
    const recs = recommendForCustomer(transactions, "d");
    expect(recs.map((r) => r.listingId)).not.toContain("y");
    expect(recs[0].listingId).toBe("x");
    expect(recommendForCustomer(transactions, "new-user")).toEqual(popularItems(transactions, 6));
  });
});

describe("trends", () => {
  it("computes moving average and linear trend", () => {
    expect(movingAverage([1, 2, 3, 4], 2)).toEqual([null, 1.5, 2.5, 3.5]);
    const t = linearTrend([2, 4, 6, 8]);
    expect(t.slope).toBe(2);
    expect(t.intercept).toBe(2);
    expect(t.r2).toBe(1);
  });

  it("forecasts a rising series upward and never negative", () => {
    const fc = holtForecast([10, 12, 14, 16, 18], 3);
    expect(fc).toHaveLength(3);
    expect(fc[2]).toBeGreaterThan(fc[0]);
    expect(holtForecast([10, 5, 1, 0], 10).every((v) => v >= 0)).toBe(true);
  });

  it("fills missing days with zeros", () => {
    const series = dailySeries([tx("1", "a", 0, [["x", 10]]), tx("2", "a", 3, [["x", 20]])], 2);
    expect(series.map((p) => p.revenue)).toEqual([10, 0, 0, 20]);
  });
});

describe("anomaly detection", () => {
  it("flags revenue spikes and drops", () => {
    const series = [100, 102, 98, 101, 99, 500, 100, 103, 0, 97].map((revenue, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      revenue,
      orders: 1,
      movingAvg: null,
    }));
    const found = detectDailyAnomalies(series);
    expect(found.find((a) => a.date === "2026-10-06")?.kind).toBe("spike");
    expect(found.find((a) => a.date === "2026-10-09")?.kind).toBe("drop");
    expect(found).toHaveLength(2);
  });

  it("flags unusually large orders with IQR fences", () => {
    const orders = [100, 110, 120, 130, 140, 150, 5000].map((v, i) => tx(String(i), "a", i, [["x", v]]));
    const { anomalies } = detectOrderAnomalies(orders);
    expect(anomalies.map((a) => a.total)).toEqual([5000]);
  });
});

describe("sample data + insights", () => {
  const sample = generateSampleTransactions();

  it("is deterministic", () => {
    expect(generateSampleTransactions()).toEqual(sample);
    expect(sample.length).toBeGreaterThan(300);
  });

  it("recovers the planted bundles and anomalies", () => {
    const fbt = frequentlyBoughtTogether(toBaskets(sample), "demo-2", 3, { minSupport: 0.01, minConfidence: 0.05 });
    expect(fbt.map((r) => r.consequent[0])).toContain("demo-5");
    const insights = buildInsights(sample);
    expect(insights.anomalies.daily.some((a) => a.kind === "spike")).toBe(true);
    expect(insights.anomalies.daily.some((a) => a.kind === "drop")).toBe(true);
    expect(insights.segments.clusters.length).toBe(4);
    expect(insights.trends.trend.slope).toBeGreaterThan(0);
    expect(salesTrends(sample).forecast).toHaveLength(7);
  });
});
