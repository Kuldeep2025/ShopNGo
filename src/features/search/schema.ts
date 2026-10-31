/**
 * Search query validation – server-side only.
 * Unknown filters are rejected; no AI-generated SQL.
 */

import { z } from "zod";
import { PRODUCT_TYPES } from "@/features/catalogue/types";

export const searchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  type: z.enum(PRODUCT_TYPES).optional(),
  minPrice: z
    .string()
    .optional()
    .transform((v) => (v !== undefined && v !== "" ? Number(v) : undefined))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), {
      message: "minPrice must be a non-negative number",
    }),
  maxPrice: z
    .string()
    .optional()
    .transform((v) => (v !== undefined && v !== "" ? Number(v) : undefined))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), {
      message: "maxPrice must be a non-negative number",
    }),
  /** above | below target price (INR only – no currency conversion) */
  priceMode: z.enum(["above", "below"]).optional(),
  targetPrice: z
    .string()
    .optional()
    .transform((v) => (v !== undefined && v !== "" ? Number(v) : undefined))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), {
      message: "targetPrice must be a non-negative number",
    }),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "title"])
    .default("newest"),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 20))
    .refine((v) => !Number.isNaN(v) && v >= 1 && v <= 50, {
      message: "limit must be between 1 and 50",
    }),
  cursor: z.string().optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
