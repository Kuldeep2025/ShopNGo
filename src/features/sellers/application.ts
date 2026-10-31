/**
 * Seller application domain logic.
 * States: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED | SUSPENDED
 * Only moderators can approve/reject. Users cannot self-approve.
 */

import { z } from "zod";

export const APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const submitApplicationSchema = z.object({
  businessName: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

export const moderateApplicationSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  reason: z.string().min(3).max(1000),
});

export type ModerateApplicationInput = z.infer<typeof moderateApplicationSchema>;

/** Transitions a customer may perform */
export function canCustomerTransition(
  current: ApplicationStatus,
  next: ApplicationStatus
): boolean {
  if (current === "DRAFT" && next === "SUBMITTED") return true;
  if (current === "REJECTED" && next === "DRAFT") return true; // re-apply
  return false;
}

/** Only moderators may perform these transitions */
export function canModeratorTransition(
  current: ApplicationStatus,
  next: ApplicationStatus
): boolean {
  if (current === "SUBMITTED" && (next === "UNDER_REVIEW" || next === "APPROVED" || next === "REJECTED"))
    return true;
  if (current === "UNDER_REVIEW" && (next === "APPROVED" || next === "REJECTED"))
    return true;
  if ((current === "APPROVED" || current === "REJECTED") && next === "SUSPENDED")
    return true;
  if (current === "SUSPENDED" && next === "APPROVED") return true;
  return false;
}
