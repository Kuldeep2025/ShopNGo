import { z } from "zod";

export const createReviewSchema = z.object({
  listingId: z.string().min(1),
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().nullable(),
  body: z.string().max(2000).optional().nullable(),
});
