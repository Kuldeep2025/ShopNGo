/**
 * Map Prisma records → safe public DTOs.
 * Never leak moderation notes, internal decision fields or private media URLs.
 */

import { computeEffectivePrice, type PricingFields } from "@/features/pricing/effectivePrice";
import type { PublicListingDTO, PublicCategoryDTO, PublicStoreDTO } from "./types";

type ListingRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  productType: string;
  price: { toString(): string } | string | number;
  currency: string;
  status: string;
  media: unknown;
  attributes: unknown;
  stock?: number | null;
  mrp?: PricingFields["mrp"];
  saleEnabled?: boolean | null;
  salePrice?: PricingFields["salePrice"];
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
  returnDays?: number | null;
  warrantyMonths?: number | null;
  guaranteeText?: string | null;
  replacementPolicy?: string | null;
  createdAt: Date | string;
  store: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export function toPublicListingDTO(record: ListingRecord): PublicListingDTO {
  const eff = computeEffectivePrice(record);
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    description: record.description,
    productType: record.productType as PublicListingDTO["productType"],
    price: eff.unitPrice,
    pricing: {
      regularPrice: eff.regularPrice,
      strikePrice: eff.strikePrice,
      percentOff: eff.percentOff,
      onSale: eff.onSale,
      saleUpcoming: eff.saleUpcoming,
      saleEndsAt: eff.saleEndsAt,
    },
    policy: {
      returnDays: record.returnDays ?? null,
      warrantyMonths: record.warrantyMonths ?? null,
      guaranteeText: record.guaranteeText ?? null,
      replacementPolicy: record.replacementPolicy ?? null,
    },
    currency: record.currency,
    store: {
      id: record.store.id,
      name: record.store.name,
      slug: record.store.slug,
    },
    category: record.category
      ? {
          id: record.category.id,
          name: record.category.name,
          slug: record.category.slug,
        }
      : null,
    media: record.media,
    attributes: record.attributes,
    inStock: record.productType !== "PHYSICAL" || record.stock == null || record.stock > 0,
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : record.createdAt.toISOString(),
  };
}

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: CategoryRecord[];
};

export function toPublicCategoryDTO(record: CategoryRecord): PublicCategoryDTO {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    parentId: record.parentId,
    children: record.children?.map(toPublicCategoryDTO),
  };
}

type StoreRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
};

export function toPublicStoreDTO(record: StoreRecord): PublicStoreDTO | null {
  // Only active stores are public
  if (!record.isActive) return null;
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    logoUrl: record.logoUrl,
  };
}
