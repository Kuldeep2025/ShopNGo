/** Turns what a seller sends (pricing and policy fields) into database fields. Used by create and edit routes. */
import { resolvePricing } from "./resolve";
import { policyInputSchema } from "@/features/policy/policy";

const PRICING_KEYS = ["mrp", "saleEnabled", "salePrice", "salePercent", "saleStartsAt", "saleEndsAt"] as const;
const POLICY_KEYS = ["returnDays", "warrantyMonths", "guaranteeText", "replacementPolicy"] as const;

export type ExistingPricing = {
  price: { toString(): string } | string | number;
  mrp?: { toString(): string } | null;
  saleEnabled?: boolean | null;
  salePrice?: { toString(): string } | null;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
};

type Raw = Record<string, unknown>;

export function touchesPricing(body: Raw): boolean {
  return PRICING_KEYS.some((k) => k in body) || "price" in body;
}

/**
 * Returns the database fields to write for pricing and policy, or a plain-language error.
 * `existing` (for edits) fills in whatever the seller did not send, so partial edits still validate as a whole.
 */
export function buildPricingPolicyData(
  body: Raw,
  priceAfterEdit: string | number,
  existing?: ExistingPricing
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const data: Record<string, unknown> = {};

  if (touchesPricing(body)) {
    const pick = <T,>(k: string, fallback: T) => (k in body ? (body[k] as T) : fallback);
    const res = resolvePricing({
      price: priceAfterEdit,
      mrp: pick("mrp", existing?.mrp ? existing.mrp.toString() : null) as string | number | null,
      saleEnabled: pick("saleEnabled", existing?.saleEnabled ?? false) as boolean,
      salePrice: "salePercent" in body && !("salePrice" in body) ? null : (pick("salePrice", existing?.salePrice ? existing.salePrice.toString() : null) as string | number | null),
      salePercent: (body.salePercent as number | null | undefined) ?? null,
      saleStartsAt: pick("saleStartsAt", existing?.saleStartsAt ?? null) as string | Date | null,
      saleEndsAt: pick("saleEndsAt", existing?.saleEndsAt ?? null) as string | Date | null,
    });
    if (!res.ok) return res;
    data.mrp = res.data.mrp;
    data.saleEnabled = res.data.saleEnabled;
    data.salePrice = res.data.salePrice;
    data.saleStartsAt = res.data.saleStartsAt;
    data.saleEndsAt = res.data.saleEndsAt;
  }

  if (POLICY_KEYS.some((k) => k in body)) {
    const parsed = policyInputSchema.safeParse(Object.fromEntries(POLICY_KEYS.filter((k) => k in body).map((k) => [k, body[k]])));
    if (!parsed.success) return { ok: false, error: "Check the return days (No returns, 7, 10, 15 or 30), warranty months and policy text (up to 500 characters)." };
    for (const k of POLICY_KEYS) {
      if (k in parsed.data) {
        const v = (parsed.data as Raw)[k];
        data[k] = typeof v === "string" && v === "" ? null : v ?? null;
      }
    }
  }
  return { ok: true, data };
}
