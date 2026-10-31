/**
 * Single public-visibility predicate for the entire catalogue.
 * Unapproved / inactive / suspended items must NEVER appear in public surfaces
 * (search, product pages, comparison, recommendations, AI retrieval).
 */

import type { ListingStatus } from "./types";

type ListingLike = {
  status: ListingStatus | string;
  store?: { isActive?: boolean } | null;
};

/**
 * Returns true only when the listing is safe to show to anonymous/public customers.
 *
 * Rules:
 * 1. Listing status must be APPROVED
 * 2. Parent store must exist and be active (isActive === true)
 * 3. Anything else (DRAFT, SUBMITTED, UNDER_REVIEW, REJECTED, SUSPENDED, ARCHIVED) → hidden
 */
export function isPubliclyVisible(listing: ListingLike): boolean {
  if (listing.status !== "APPROVED") {
    return false;
  }
  if (!listing.store || listing.store.isActive !== true) {
    return false;
  }
  return true;
}

/**
 * Filter helper for arrays of listings.
 */
export function filterPublicListings<T extends ListingLike>(listings: T[]): T[] {
  return listings.filter(isPubliclyVisible);
}
