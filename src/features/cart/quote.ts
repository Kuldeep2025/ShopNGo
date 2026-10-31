/**
 * Server-authoritative cart quote.
 * Client never supplies totals – server reloads approval, price, stock.
 */

import { z } from "zod";

export const addToCartSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99), // 0 = remove
});

export type QuoteLine = {
  listingId: string;
  title: string;
  productType: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  currency: string;
  storeId: string;
  storeName: string;
  available: boolean;
  issues: string[];
};

export type QuoteResult = {
  lines: QuoteLine[];
  subtotal: string;
  currency: string;
  allAvailable: boolean;
  issues: string[];
};

/** Decimal-safe money helpers (string-based to avoid float drift) */
export function multiplyMoney(unitPrice: string, qty: number): string {
  const cents = Math.round(Number(unitPrice) * 100) * qty;
  return (cents / 100).toFixed(2);
}

export function addMoney(amounts: string[]): string {
  const totalCents = amounts.reduce(
    (sum, a) => sum + Math.round(Number(a) * 100),
    0
  );
  return (totalCents / 100).toFixed(2);
}
