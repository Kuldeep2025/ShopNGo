import { describe, expect, it } from "vitest";
import { toPublicListingDTO } from "./dto";
import { getListingImageUrl } from "./media";

const record = {
  id: "l1", title: "Thing", slug: "thing", description: "d", productType: "PHYSICAL", price: "10", currency: "INR",
  status: "APPROVED", media: [{ url: "/images/mall/thing.svg", alt: "A thing" }], attributes: {},
  createdAt: new Date("2026-01-01"), store: { id: "s", name: "S", slug: "s", isActive: true },
};

describe("public listing DTO", () => {
  it("marks physical items with no stock as out of stock", () => {
    expect(toPublicListingDTO({ ...record, stock: 0 }).inStock).toBe(false);
    expect(toPublicListingDTO({ ...record, stock: 3 }).inStock).toBe(true);
  });

  it("never marks digital items or untracked stock as out of stock", () => {
    expect(toPublicListingDTO({ ...record, productType: "EBOOK", stock: 0 }).inStock).toBe(true);
    expect(toPublicListingDTO({ ...record, stock: null }).inStock).toBe(true);
  });

  it("does not expose the stock count", () => {
    expect(JSON.stringify(toPublicListingDTO({ ...record, stock: 7 }))).not.toContain('"stock"');
  });
});

describe("listing images", () => {
  it("accepts local image paths even when only local images are allowed", () => {
    expect(getListingImageUrl(record, true)).toBe("/images/mall/thing.svg");
  });
});
