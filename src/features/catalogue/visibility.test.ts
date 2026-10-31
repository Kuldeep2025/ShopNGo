/**
 * Manual / vitest-compatible tests for the public-visibility predicate.
 * Run with: npx vitest run src/features/catalogue/visibility.test.ts
 * (after npm install)
 */

import { describe, it, expect } from "vitest";
import { isPubliclyVisible, filterPublicListings } from "./visibility";

describe("isPubliclyVisible", () => {
  it("returns true only for APPROVED listing on active store", () => {
    expect(
      isPubliclyVisible({ status: "APPROVED", store: { isActive: true } })
    ).toBe(true);
  });

  it("returns false for APPROVED listing on inactive store", () => {
    expect(
      isPubliclyVisible({ status: "APPROVED", store: { isActive: false } })
    ).toBe(false);
  });

  it("returns false when store is missing", () => {
    expect(isPubliclyVisible({ status: "APPROVED" })).toBe(false);
  });

  it.each([
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "REJECTED",
    "SUSPENDED",
    "ARCHIVED",
  ] as const)("returns false for status %s", (status) => {
    expect(
      isPubliclyVisible({ status, store: { isActive: true } })
    ).toBe(false);
  });
});

describe("filterPublicListings", () => {
  it("keeps only publicly visible items", () => {
    const items = [
      { id: 1, status: "APPROVED", store: { isActive: true } },
      { id: 2, status: "DRAFT", store: { isActive: true } },
      { id: 3, status: "APPROVED", store: { isActive: false } },
      { id: 4, status: "APPROVED", store: { isActive: true } },
    ];
    const result = filterPublicListings(items);
    expect(result.map((i) => i.id)).toEqual([1, 4]);
  });
});
