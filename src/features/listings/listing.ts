/**
 * Listing domain: draft/edit by seller, moderation by moderator.
 * Material edits to APPROVED listings return them to SUBMITTED.
 */

import { z } from "zod";
import { PRODUCT_TYPES } from "@/features/catalogue/types";

export const listingStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "ARCHIVED",
]);

const base = {
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
      message: "Price must be a non-negative number",
    }),
  currency: z.string().length(3).default("INR"),
  categoryId: z.string().optional().nullable(),
  attributes: z.record(z.unknown()).optional().nullable(),
};

export const createListingSchema = z.discriminatedUnion("productType", [
  z.object({
    ...base,
    productType: z.literal("PHYSICAL"),
    stock: z.number().int().min(0),
  }),
  z.object({
    ...base,
    productType: z.enum(["DIGITAL", "EBOOK", "E_NOTE", "COURSE", "SERVICE"]),
    stock: z.number().int().min(0).optional().nullable(),
  }),
]);

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = z.object({
  title: base.title.optional(),
  description: base.description,
  price: base.price.optional(),
  currency: base.currency.optional(),
  categoryId: base.categoryId,
  attributes: base.attributes,
  productType: z.enum(PRODUCT_TYPES).optional(),
  stock: z.number().int().min(0).optional().nullable(),
});

export const moderateListingSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  reason: z.string().min(3).max(1000),
});

/** Fields considered material – changing them on an APPROVED listing requires re-review */
export const MATERIAL_FIELDS = [
  "title",
  "description",
  "price",
  "currency",
  "productType",
  "stock",
  "categoryId",
  "attributes",
] as const;

export function isMaterialChange(
  existing: Record<string, unknown>,
  update: Record<string, unknown>
): boolean {
  for (const key of MATERIAL_FIELDS) {
    if (key in update && update[key] !== undefined) {
      const prev = existing[key];
      const next = update[key];
      // Normalise numbers/strings for price
      if (String(prev) !== String(next)) return true;
    }
  }
  return false;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "listing";
}
