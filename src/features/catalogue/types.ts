/**
 * Catalogue domain types and constants.
 * Product types and listing statuses match the Prisma enums.
 */

export const PRODUCT_TYPES = [
  "PHYSICAL",
  "DIGITAL",
  "EBOOK",
  "E_NOTE",
  "COURSE",
  "SERVICE",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const LISTING_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "ARCHIVED",
] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Human-readable labels for UI */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  PHYSICAL: "Physical product",
  DIGITAL: "Digital download",
  EBOOK: "E-book",
  E_NOTE: "E-note",
  COURSE: "Course",
  SERVICE: "Service",
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};

/** Safe public DTO – never exposes moderation notes or internal IDs beyond need */
export type PublicListingDTO = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  productType: ProductType;
  price: string; // Decimal serialised as string
  currency: string;
  store: {
    id: string;
    name: string;
    slug: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  media: unknown;
  attributes: unknown;
  createdAt: string;
};

export type PublicCategoryDTO = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: PublicCategoryDTO[];
};

export type PublicStoreDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
};
