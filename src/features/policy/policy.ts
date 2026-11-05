/** Return, warranty, guarantee and replacement policy a seller sets per product. */
import { z } from "zod";

export const RETURN_OPTIONS = [
  { days: 0, label: "No returns" },
  { days: 7, label: "7 days" },
  { days: 10, label: "10 days" },
  { days: 15, label: "15 days" },
  { days: 30, label: "30 days" },
] as const;

export const policyInputSchema = z.object({
  returnDays: z.union([z.literal(0), z.literal(7), z.literal(10), z.literal(15), z.literal(30)]).nullable().optional(),
  warrantyMonths: z.number().int().min(0).max(120).nullable().optional(),
  guaranteeText: z.string().trim().max(500).nullable().optional(),
  replacementPolicy: z.string().trim().max(500).nullable().optional(),
});

export type PolicyFields = {
  returnDays: number | null;
  warrantyMonths: number | null;
  guaranteeText: string | null;
  replacementPolicy: string | null;
};

export function returnPolicyText(days: number | null | undefined): string {
  if (days === null || days === undefined) return "The seller has not stated a return policy.";
  if (days === 0) return "No returns. This product cannot be returned.";
  return `${days} day${days === 1 ? "" : "s"} return after delivery.`;
}

export function warrantyText(months: number | null | undefined): string {
  if (!months) return "No warranty.";
  if (months % 12 === 0) {
    const y = months / 12;
    return `${y} year${y === 1 ? "" : "s"} warranty.`;
  }
  return `${months} month${months === 1 ? "" : "s"} warranty.`;
}

/** Last day on which a return can be started, or null when returns are not offered or the date is unknown. */
export function returnWindowEnds(deliveredAt: Date | string | null | undefined, days: number | null | undefined): Date | null {
  if (!deliveredAt || !days) return null;
  const d = new Date(deliveredAt);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + days * 86_400_000);
}
