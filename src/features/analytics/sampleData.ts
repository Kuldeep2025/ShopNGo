/**
 * Deterministic synthetic order history over the demo catalogue.
 * Used when no database is configured (or it has no paid orders), so every
 * data mining feature can be explored locally. Patterns are planted on
 * purpose: product bundles, a growth trend, weekend uplift, two revenue
 * spikes, one outage-style drop and a few unusually large orders.
 */
import { DEMO_LISTINGS } from "@/lib/demo-data";
import { createRng } from "./random";
import type { Transaction, TransactionItem } from "./types";

const DAY_MS = 86_400_000;

// Items that tend to be bought together (planted associations).
const BUNDLES: string[][] = [
  ["demo-2", "demo-5"], // Python course + resume review
  ["demo-3", "demo-6"], // Physics notes + simple living ebook
  ["demo-1", "demo-2"], // Earbuds + Python course
  ["demo-4", "demo-6"], // Bedsheet set + ebook
];

export type SampleOptions = { days?: number; customers?: number; seed?: number; endDate?: Date };

export function generateSampleTransactions(options: SampleOptions = {}): Transaction[] {
  const { days = 90, customers = 120, seed = 7, endDate = new Date("2026-10-31T12:00:00Z") } = options;
  const rng = createRng(seed);
  const listings = DEMO_LISTINGS.map((l) => ({ id: l.id, title: l.title, price: Number(l.price) }));
  const byId = new Map(listings.map((l) => [l.id, l]));

  // Customer personas: a heavy-tailed activity weight.
  const activity = Array.from({ length: customers }, () => Math.pow(rng(), 3));
  const totalActivity = activity.reduce((a, b) => a + b, 0);
  const pickCustomer = () => {
    let r = rng() * totalActivity;
    for (let i = 0; i < customers; i++) {
      r -= activity[i];
      if (r <= 0) return i;
    }
    return customers - 1;
  };

  const start = endDate.getTime() - (days - 1) * DAY_MS;
  const transactions: Transaction[] = [];
  let seq = 0;

  for (let d = 0; d < days; d++) {
    const dayStart = start + d * DAY_MS;
    const weekday = new Date(dayStart).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    let orders = Math.round(4 + d * 0.06 + (weekend ? 3 : 0) + rng() * 3);
    if (d === Math.floor(days * 0.45) || d === days - 12) orders *= 4; // promo spikes
    if (d === Math.floor(days * 0.7)) orders = 0; // outage-style drop

    for (let o = 0; o < orders; o++) {
      const items = new Map<string, number>();
      if (rng() < 0.45) {
        for (const id of BUNDLES[Math.floor(rng() * BUNDLES.length)]) items.set(id, 1);
      } else {
        items.set(listings[Math.floor(rng() * listings.length)].id, 1);
      }
      if (rng() < 0.2) {
        const extra = listings[Math.floor(rng() * listings.length)].id;
        items.set(extra, (items.get(extra) ?? 0) + 1);
      }
      // Rare bulk orders (anomalies by value).
      if (rng() < 0.01) items.set("demo-1", 8 + Math.floor(rng() * 6));

      const lineItems: TransactionItem[] = [...items.entries()].map(([id, quantity]) => {
        const l = byId.get(id)!;
        return { listingId: id, title: l.title, quantity, unitPrice: l.price };
      });
      transactions.push({
        orderId: `sample-${String(++seq).padStart(5, "0")}`,
        customerId: `customer-${String(pickCustomer() + 1).padStart(3, "0")}`,
        createdAt: new Date(dayStart + Math.floor(rng() * 10 * 3_600_000)),
        total: lineItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0),
        items: lineItems,
      });
    }
  }
  return transactions;
}
