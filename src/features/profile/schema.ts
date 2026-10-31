/**
 * Profile and address validation.
 * Users may only manage their own data.
 */

import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional().nullable(),
  phone: z
    .string()
    .max(20)
    .regex(/^[+0-9\s()-]*$/, "Invalid phone format")
    .optional()
    .nullable(),
  bio: z.string().max(500).optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const addressSchema = z.object({
  label: z.string().max(50).optional().nullable(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2).default("IN"), // ISO 3166-1 alpha-2
  isDefault: z.boolean().optional().default(false),
  /** Optional coordinates – only stored with explicit consent notice in UI */
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
});

export type AddressInput = z.infer<typeof addressSchema>;
