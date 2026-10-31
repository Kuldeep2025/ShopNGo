"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Badge, Spinner } from "@/components/ui";
import type { Insights } from "@/features/analytics";

type InsightsResponse = Insights & { source: string };

const inr = (n: number) => `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/**
 * Data mining dashboard: market basket rules, customer segments,
 * sales trend + forecast, anomalies and best sellers.
 * With a database configured, a moderator/admin sign-in is required.
 */
export default function InsightsPage() {
  const { loading: authLoading, getIdToken } = useAuth();
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/analytics/insights", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 401) return setError("Please sign in with a moderator or admin account to see store insights.");
        if (res.status === 403) return setError("Forbidden – moderator or admin role required.");
        if (!res.ok) return setError("Failed to load insights.");
        setData(await res.json());
      } catch {
        setError("Network error.");
      }
    })();
  }, [authLoading, getIdToken]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Store insights</h1>
        {data.source !== "database" && <Badge variant="default">Sample data</Badge>}
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Data mining over paid orders: market basket analysis, customer segmentation, trends, forecasting and anomaly detection.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label="Revenue" value={inr(data.totals.revenue)} />
        <Stat label="Orders" value={String(data.totals.orders)} />
        <Stat label="Avg. order value" value={inr(data.totals.averageOrderValue)} />
        <Stat
          label="Week over week"
          value={data.trends.weekOverWeekGrowth === null ? "–" : pct(data.trends.weekOverWeekGrowth)}
        />
      </div>

      <Card title="Daily revenue, 7-day average and 7-day forecast">
        <RevenueChart data={data} />
        <p className="mt-2 text-xs text-gray-500">
          Trend: {data.trends.trend.slope >= 0 ? "+" : ""}
          {inr(data.trends.trend.slope)} per day (R² {data.trends.trend.r2.toFixed(2)}). Forecast uses Holt’s linear smoothing.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Frequently bought together (Apriori)">
          <ul className="divide-y divide-gray-100 text-sm">
            {data.associationRules.slice(0, 8).map((r, i) => (
              <li key={i} className="py-2">
                <span className="font-medium text-gray-900">{r.antecedentTitles.join(" + ")}</span>
                <span className="text-gray-400"> → </span>
                <span className="text-gray-800">{r.consequentTitles.join(" + ")}</span>
                <div className="text-xs text-gray-500">
                  support {pct(r.support)} · confidence {pct(r.confidence)} · lift {r.lift.toFixed(2)}
                </div>
              </li>
            ))}
            {data.associationRules.length === 0 && <li className="py-2 text-gray-500">Not enough baskets yet.</li>}
          </ul>
        </Card>

        <Card title="Customer segments (RFM + k-means)">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-1">Cluster</th>
                <th>Customers</th>
                <th>Recency</th>
                <th>Orders</th>
                <th>Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.segments.clusters.map((c) => (
                <tr key={c.cluster}>
                  <td className="py-2 font-medium text-gray-900">{c.label}</td>
                  <td>{c.size}</td>
                  <td>{c.avgRecencyDays} d</td>
                  <td>{c.avgFrequency}</td>
                  <td>{inr(c.avgMonetary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(data.segments.rfmSegments).map(([name, count]) => (
              <Badge key={name} variant="default">
                {name}: {count}
              </Badge>
            ))}
          </div>
        </Card>

        <Card title="Anomalies">
          <p className="text-xs font-semibold uppercase text-gray-500">Unusual days (robust z-score vs. rolling median)</p>
          <ul className="mt-1 text-sm">
            {data.anomalies.daily.map((a) => (
              <li key={a.date + a.metric} className="py-1">
                {a.date}: {a.metric === "revenue" ? inr(a.value) : `${a.value} orders`}{" "}
                <span className={a.kind === "spike" ? "text-teal-700" : "text-red-600"}>
                  {a.kind} (z = {a.score})
                </span>
              </li>
            ))}
            {data.anomalies.daily.length === 0 && <li className="py-1 text-gray-500">None detected.</li>}
          </ul>
          <p className="mt-4 text-xs font-semibold uppercase text-gray-500">Unusual orders (IQR)</p>
          <ul className="mt-1 text-sm">
            {data.anomalies.orders.slice(0, 5).map((o) => (
              <li key={o.orderId} className="py-1">
                {inr(o.total)} on {o.createdAt.slice(0, 10)} <span className="text-gray-500">– {o.reason}</span>
              </li>
            ))}
            {data.anomalies.orders.length === 0 && <li className="py-1 text-gray-500">None detected.</li>}
          </ul>
        </Card>

        <Card title="Best sellers">
          <ul className="divide-y divide-gray-100 text-sm">
            {data.trends.topProducts.map((p) => (
              <li key={p.listingId} className="flex justify-between py-2">
                <span className="text-gray-900">{p.title}</span>
                <span className="text-gray-600">
                  {p.units} units · {inr(p.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-gray-200 p-5">
      <h2 className="mb-3 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function RevenueChart({ data }: { data: InsightsResponse }) {
  const series = data.trends.series;
  const forecast = data.trends.forecast;
  const all = [...series.map((p) => p.revenue), ...forecast.map((f) => f.revenue)];
  const max = Math.max(1, ...all);
  const W = 800;
  const H = 200;
  const n = all.length;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (v: number) => H - (v / max) * (H - 10);
  const line = (pts: [number, number][]) => pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

  const revenuePath = line(series.map((p, i) => [x(i), y(p.revenue)]));
  const maPath = line(
    series.flatMap((p, i) => (p.movingAvg === null ? [] : [[x(i), y(p.movingAvg)] as [number, number]]))
  );
  const fcStart = series.length - 1;
  const fcPath = line([
    [x(fcStart), y(series[fcStart]?.revenue ?? 0)],
    ...forecast.map((f, i) => [x(fcStart + i + 1), y(f.revenue)] as [number, number]),
  ]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" role="img" aria-label="Revenue chart">
      <path d={revenuePath} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />
      <path d={maPath} fill="none" stroke="#0f766e" strokeWidth={2.5} />
      <path d={fcPath} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 4" />
    </svg>
  );
}
