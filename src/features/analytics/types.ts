/**
 * Data mining domain types.
 * A Transaction is one paid order reduced to what the mining algorithms need.
 * Customer ids are opaque; no personal fields ever enter this module.
 */

export type TransactionItem = {
  listingId: string;
  title: string;
  quantity: number;
  unitPrice: number;
};

export type Transaction = {
  orderId: string;
  customerId: string;
  createdAt: Date;
  total: number;
  items: TransactionItem[];
};

export type AnalyticsSource = "database" | "sample" | "sample-fallback";
