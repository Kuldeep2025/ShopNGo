/**
 * Zod schemas for catalogue inputs.
 * Type-specific field validation lives here.
 */

import { z } from "zod";
import { PRODUCT_TYPES } from "./types";

export const productTypeSchema = z.enum(PRODUCT_TYPES);

/** Base fields shared by all product types */
const baseListingFields = {
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  productType: productTypeSchema,
  price: z
    .string()
    .or(z.number())
    .transform((v) => String(v))
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
      message: "Price must be a non-negative number",
    }),
  currency: z.string().length(3).default("INR"),
  categoryId: z.string().cuid().optional().nullable(),
  attributes: z.record(z.unknown()).optional().nullable(),
};

/** Physical products require stock */
const physicalSchema = z.object({
  ...baseListingFields,
  productType: z.literal("PHYSICAL"),
  stock: z.number().int().min(0),
});

/** Digital / Ebook / E-note – no stock, optional file metadata later */
const digitalSchema = z.object({
  ...baseListingFields,
  productType: z.enum(["DIGITAL", "EBOOK", "E_NOTE"]),
  stock: z.null().optional(),
});

/** Course – entitlement based */
const courseSchema = z.object({
  ...baseListingFields,
  productType: z.literal("COURSE"),
  stock: z.null().optional(),
});

/** Service – no inventory */
const serviceSchema = z.object({
  ...baseListingFields,
  productType: z.literal("SERVICE"),
  stock: z.null().optional(),
});

export const createListingSchema = z.discriminatedUnion("productType", [
  physicalSchema,
  digitalSchema,
  courseSchema,
  serviceSchema,
]);

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  parentId: z.string().cuid().optional().nullable(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
