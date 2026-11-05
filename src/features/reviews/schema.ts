import { z } from "zod";

/**
 * Any signed-in member can rate a product 1 to 5 stars with an optional review.
 * One review per member per product: posting again edits it.
 * A "Verified purchase" mark is added by the server when the member has a paid order for the product.
 */
export const createReviewSchema = z.object({
  listingId: z.string().min(1),
  /** Old clients still send this. It is no longer required. */
  orderItemId: z.string().optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().nullable(),
  body: z.string().trim().max(2000).optional().nullable(),
});

export const VERIFIED_ORDER_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
