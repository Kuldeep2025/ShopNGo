import type { Transaction } from "./types";

/** Baskets (unique listing ids per order) for association mining. */
export function toBaskets(transactions: Transaction[]): string[][] {
  return transactions.map((t) => [...new Set(t.items.map((i) => i.listingId))]);
}
