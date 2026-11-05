/** Pure types and helpers, safe to import from client components. */
export type SiteStats = {
  products: number;
  stores: number;
  categories: number;
  users: number;
  sellers: number;
  deliveryPartners: number;
  orders: number;
  reviews: number;
  averageRating: number | null;
  source: "live" | "fallback";
  updatedAt: string;
};

/** The tiles shown on the About page, built from one stats object. */
export function statTiles(s: SiteStats): { key: string; value: number; label: string; decimals?: number }[] {
  const tiles = [
    { key: "products", value: s.products, label: "products you can buy right now" },
    { key: "stores", value: s.stores, label: "active stores" },
    { key: "categories", value: s.categories, label: "categories" },
  ];
  if (s.source === "live") {
    tiles.push(
      { key: "users", value: s.users, label: "registered members" },
      { key: "deliveryPartners", value: s.deliveryPartners, label: "delivery partners" },
      { key: "orders", value: s.orders, label: "orders placed" },
      { key: "reviews", value: s.reviews, label: "customer reviews" }
    );
  }
  return tiles;
}
