/**
 * Item-based collaborative filtering.
 * Builds a customer × item purchase matrix and scores items by cosine
 * similarity to what the customer (or the current product) already has.
 */
import type { Transaction } from "./types";
import { round } from "./apriori";

export type ItemSimilarity = { listingId: string; score: number };

/** Map listingId -> set of customers who bought it. */
function buyersByItem(transactions: Transaction[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const t of transactions) {
    for (const it of t.items) {
      const s = m.get(it.listingId) ?? new Set<string>();
      s.add(t.customerId);
      m.set(it.listingId, s);
    }
  }
  return m;
}

/** Cosine similarity of two binary vectors given as sets. */
function cosine(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  return inter / Math.sqrt(a.size * b.size);
}

export function similarItems(transactions: Transaction[], listingId: string, limit = 4): ItemSimilarity[] {
  const buyers = buyersByItem(transactions);
  const target = buyers.get(listingId);
  if (!target) return [];
  return [...buyers.entries()]
    .filter(([id]) => id !== listingId)
    .map(([id, set]) => ({ listingId: id, score: round(cosine(target, set)) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.listingId.localeCompare(b.listingId))
    .slice(0, limit);
}

/** Personalised recommendations: items similar to the customer's history, excluding owned ones. */
export function recommendForCustomer(transactions: Transaction[], customerId: string, limit = 6): ItemSimilarity[] {
  const buyers = buyersByItem(transactions);
  const owned = new Set<string>();
  for (const t of transactions) if (t.customerId === customerId) for (const it of t.items) owned.add(it.listingId);
  if (owned.size === 0) return popularItems(transactions, limit);

  const scores = new Map<string, number>();
  for (const [candidate, set] of buyers) {
    if (owned.has(candidate)) continue;
    let s = 0;
    for (const o of owned) s += cosine(buyers.get(o)!, set);
    if (s > 0) scores.set(candidate, s / owned.size);
  }
  return [...scores.entries()]
    .map(([listingId, score]) => ({ listingId, score: round(score) }))
    .sort((a, b) => b.score - a.score || a.listingId.localeCompare(b.listingId))
    .slice(0, limit);
}

/** Popularity baseline (cold start): share of customers who bought each item. */
export function popularItems(transactions: Transaction[], limit = 6): ItemSimilarity[] {
  const buyers = buyersByItem(transactions);
  const customers = new Set(transactions.map((t) => t.customerId)).size || 1;
  return [...buyers.entries()]
    .map(([listingId, set]) => ({ listingId, score: round(set.size / customers) }))
    .sort((a, b) => b.score - a.score || a.listingId.localeCompare(b.listingId))
    .slice(0, limit);
}
