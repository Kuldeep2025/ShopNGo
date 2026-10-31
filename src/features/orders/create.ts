/**
 * Multi-store order creation – transactional, idempotent.
 * One parent Order + one SellerOrder per store.
 * Snapshots price/title/address at purchase time.
 */

import { z } from "zod";

export const createOrderSchema = z.object({
  addressId: z.string().min(1),
  /** Client must send Idempotency-Key header; body may echo it */
  note: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
