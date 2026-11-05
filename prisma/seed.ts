/**
 * Seeds the database with a demo catalogue (stores, categories, products)
 * and a synthetic paid-order history so the recommendation and insight
 * features have data to learn from. Safe to run more than once.
 *
 *   npx prisma db seed
 *
 * Seeded accounts are placeholders (no one can sign in as them).
 * Your own account becomes admin through the ADMIN_EMAILS setting.
 */
import { Prisma, PrismaClient, type ProductType } from "@prisma/client";
import { DEMO_CATEGORIES, DEMO_LISTINGS } from "../src/lib/demo-data";
import { generateSampleTransactions } from "../src/features/analytics/sampleData";
import { createRng } from "../src/features/analytics/random";
import { generateMallCatalogue } from "../src/lib/mall/generate";
import { MALL_PARENTS, MALL_SUBCATEGORIES } from "../src/lib/mall/specs";

const prisma = new PrismaClient();

const STORE_OWNERS: Record<string, { name: string; slug: string; description: string }> = {};
for (const l of DEMO_LISTINGS) {
  STORE_OWNERS[l.store.id] = {
    name: l.store.name,
    slug: l.store.slug,
    description: `${l.store.name} on ShopNGo.`,
  };
}

async function seedCatalogue() {
  const categoryIds = new Set<string>();
  for (const parent of DEMO_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: parent.id },
      update: { name: parent.name, slug: parent.slug },
      create: { id: parent.id, name: parent.name, slug: parent.slug },
    });
    categoryIds.add(parent.id);
    for (const child of parent.children ?? []) {
      await prisma.category.upsert({
        where: { id: child.id },
        update: { name: child.name, slug: child.slug, parentId: parent.id },
        create: { id: child.id, name: child.name, slug: child.slug, parentId: parent.id },
      });
      categoryIds.add(child.id);
    }
  }

  for (const [storeId, store] of Object.entries(STORE_OWNERS)) {
    const owner = await prisma.user.upsert({
      where: { firebaseUid: `seed-owner-${storeId}` },
      update: {},
      create: {
        firebaseUid: `seed-owner-${storeId}`,
        email: `owner-${storeId}@seed.shopngo.invalid`,
        displayName: `${store.name} owner`,
        roles: ["CUSTOMER", "SELLER"],
      },
    });
    await prisma.store.upsert({
      where: { id: storeId },
      update: { name: store.name, slug: store.slug, description: store.description, isActive: true },
      create: { id: storeId, ownerId: owner.id, ...store, isActive: true },
    });
  }

  for (const l of DEMO_LISTINGS) {
    const physical = l.productType === "PHYSICAL";
    const data = {
      storeId: l.store.id,
      categoryId: l.category && categoryIds.has(l.category.id) ? l.category.id : null,
      title: l.title,
      slug: l.slug,
      description: l.description,
      productType: l.productType as ProductType,
      price: l.price,
      currency: l.currency,
      status: "APPROVED" as const,
      stock: physical ? 500 : null,
      attributes: l.attributes ?? {},
      media: l.media ?? [],
    };
    await prisma.listing.upsert({ where: { id: l.id }, update: data, create: { id: l.id, ...data } });
  }
  console.log(`Catalogue ready: ${DEMO_LISTINGS.length} products in ${Object.keys(STORE_OWNERS).length} stores.`);
}

const chunk = <T,>(arr: T[], n = 500) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/** The 2,230-product ShopNGo Mall: categories, stores, products with images. */
async function seedMall() {
  const products = generateMallCatalogue();

  const parents = MALL_PARENTS.filter((p) => !p.existing).map((p) => ({ id: p.id, name: p.name, slug: p.slug }));
  await prisma.category.createMany({ data: parents, skipDuplicates: true });
  await prisma.category.createMany({
    data: MALL_SUBCATEGORIES.filter((c) => !c.existing).map((c) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parent })),
    skipDuplicates: true,
  });

  const stores = MALL_PARENTS.flatMap((p) => p.stores);
  await prisma.user.createMany({
    data: stores.map((st) => ({
      id: `mall-owner-${st.key}`,
      firebaseUid: `seed-mall-owner-${st.key}`,
      email: `owner-${st.key}@seed.shopngo.invalid`,
      displayName: `${st.name} owner`,
      roles: ["CUSTOMER" as const, "SELLER" as const],
    })),
    skipDuplicates: true,
  });
  await prisma.store.createMany({
    data: stores.map((st) => ({
      id: `mall-store-${st.key}`,
      ownerId: `mall-owner-${st.key}`,
      name: st.name,
      slug: st.key,
      description: st.description,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  for (const part of chunk(products)) {
    await prisma.listing.createMany({
      data: part.map((p) => ({
        id: p.id,
        storeId: p.storeId,
        categoryId: p.categoryId,
        title: p.title,
        slug: p.slug,
        description: p.description,
        productType: "PHYSICAL" as const,
        price: p.price,
        currency: "INR",
        status: "APPROVED" as const,
        stock: p.stock,
        attributes: { brand: p.brand, series: p.series, variant: p.variant, sku: p.sku },
        media: [{ url: p.imagePath, alt: p.imageAlt }],
        createdAt: p.createdAt,
      })),
      skipDuplicates: true,
    });
  }
  console.log(`Mall ready: ${products.length} products in ${stores.length} stores.`);
  return products;
}

const MALL_THEMES: string[][] = [
  ["cat-phones", "mall-cat-mobile-accessories", "mall-cat-audio"],
  ["cat-laptops", "mall-cat-gaming", "mall-cat-mobile-accessories"],
  ["mall-cat-kitchen", "mall-cat-appliances", "mall-cat-storage"],
  ["mall-cat-skincare", "mall-cat-haircare", "mall-cat-makeup"],
  ["mall-cat-staples", "mall-cat-spices", "mall-cat-breakfast"],
  ["mall-cat-snacks", "mall-cat-beverages"],
  ["mall-cat-fitness", "mall-cat-yoga", "mall-cat-wearables"],
  ["mall-cat-toys", "mall-cat-baby"],
  ["mall-cat-print-books", "mall-cat-stationery"],
  ["mall-cat-mens-clothing", "mall-cat-footwear", "mall-cat-watches"],
  ["mall-cat-womens-clothing", "mall-cat-bags", "mall-cat-fragrance"],
  ["mall-cat-bedding", "mall-cat-bath", "mall-cat-decor"],
];

/** Synthetic paid orders and reviews over the mall, so recommendations and ratings have data. */
async function seedMallActivity(products: ReturnType<typeof generateMallCatalogue>) {
  const existing = await prisma.order.count({ where: { paymentProvider: "seed-mall" } });
  if (existing > 0) {
    console.log(`Mall order history already seeded (${existing} orders). Skipping.`);
    return;
  }
  const rng = createRng(4242);
  const customers = Array.from({ length: 120 }, (_, i) => `seed-customer-${String(i + 1).padStart(3, "0")}`);
  await prisma.user.createMany({
    data: customers.map((id) => ({ id, firebaseUid: id, email: `${id}@seed.shopngo.invalid`, displayName: id, roles: ["CUSTOMER" as const] })),
    skipDuplicates: true,
  });

  const byCat = new Map<string, typeof products>();
  for (const p of products) byCat.set(p.categoryId, [...(byCat.get(p.categoryId) ?? []), p]);
  // A small "popular" slice per category makes the same pairs recur, which is what pattern mining looks for.
  const popular = (cat: string) => (byCat.get(cat) ?? []).slice(0, 12);
  const pickOne = <T,>(list: T[]) => list[Math.floor(rng() * list.length)]!;

  const dayMs = 86_400_000;
  const end = new Date("2026-11-01T12:00:00Z").getTime();
  const orders: Prisma.OrderCreateManyInput[] = [];
  const sellerOrders: { id: string; orderId: string; storeId: string; status: "DELIVERED"; subtotal: string; createdAt: Date }[] = [];
  const items: { orderId: string; sellerOrderId: string; listingId: string; titleSnapshot: string; priceSnapshot: string; quantity: number; productType: "PHYSICAL" }[] = [];

  for (let i = 0; i < 3000; i++) {
    const chosen = new Map<string, (typeof products)[number]>();
    if (rng() < 0.7) {
      const theme = pickOne(MALL_THEMES);
      for (const cat of theme.filter((c) => byCat.has(c))) if (rng() < 0.75) { const p = pickOne(popular(cat)); chosen.set(p.id, p); }
    }
    if (chosen.size === 0) { const p = pickOne(products); chosen.set(p.id, p); }
    const createdAt = new Date(end - Math.floor(rng() * 90 * dayMs));
    const orderId = `seed-mall-order-${String(i + 1).padStart(5, "0")}`;
    const perStore = new Map<string, number>();
    let total = 0;
    for (const p of chosen.values()) {
      const quantity = rng() < 0.85 ? 1 : 2;
      total += Number(p.price) * quantity;
      perStore.set(p.storeId, (perStore.get(p.storeId) ?? 0) + Number(p.price) * quantity);
      items.push({ orderId, sellerOrderId: `${orderId}-${p.storeId}`, listingId: p.id, titleSnapshot: p.title, priceSnapshot: p.price, quantity, productType: "PHYSICAL" });
    }
    orders.push({ id: orderId, customerId: pickOne(customers), status: "DELIVERED", totalAmount: total.toFixed(2), currency: "INR", paymentProvider: "seed-mall", paymentRef: `seed-mall:${orderId}`, createdAt });
    for (const [storeId, subtotal] of perStore) sellerOrders.push({ id: `${orderId}-${storeId}`, orderId, storeId, status: "DELIVERED", subtotal: subtotal.toFixed(2), createdAt });
  }
  for (const part of chunk(orders)) await prisma.order.createMany({ data: part, skipDuplicates: true });
  for (const part of chunk(sellerOrders)) await prisma.sellerOrder.createMany({ data: part, skipDuplicates: true });
  for (const part of chunk(items)) await prisma.orderItem.createMany({ data: part, skipDuplicates: true });

  const titles = ["Good value", "Works as described", "Happy with it", "Solid quality", "Does the job", "Worth the price"];
  const bodies = ["Arrived on time and matches the description.", "Good build and easy to use every day.", "Better than I expected for the price.", "Packaging was neat and the product feels sturdy.", "I would buy this again."];
  const reviews: { listingId: string; userId: string; rating: number; title: string; body: string; createdAt: Date }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 1500; i++) {
    const p = pickOne(products.slice(0, 600));
    const userId = pickOne(customers);
    if (seen.has(p.id + userId)) continue;
    seen.add(p.id + userId);
    const rating = rng() < 0.55 ? 5 : rng() < 0.6 ? 4 : rng() < 0.5 ? 3 : rng() < 0.5 ? 2 : 1;
    reviews.push({ listingId: p.id, userId, rating, title: pickOne(titles), body: pickOne(bodies), createdAt: new Date(end - Math.floor(rng() * 60 * dayMs)) });
  }
  for (const part of chunk(reviews)) await prisma.review.createMany({ data: part, skipDuplicates: true });
  console.log(`Mall activity ready: ${orders.length} orders, ${reviews.length} reviews.`);
}

async function seedOrderHistory() {
  const existing = await prisma.order.count({ where: { paymentProvider: "seed" } });
  if (existing > 0) {
    console.log(`Order history already seeded (${existing} orders). Skipping.`);
    return;
  }

  const transactions = generateSampleTransactions();
  const customerIds = [...new Set(transactions.map((t) => t.customerId))];
  await prisma.user.createMany({
    data: customerIds.map((c) => ({
      id: `seed-${c}`,
      firebaseUid: `seed-${c}`,
      email: `${c}@seed.shopngo.invalid`,
      displayName: c,
      roles: ["CUSTOMER" as const],
    })),
    skipDuplicates: true,
  });

  const storeOf = new Map(DEMO_LISTINGS.map((l) => [l.id, l.store.id]));
  const typeOf = new Map(DEMO_LISTINGS.map((l) => [l.id, l.productType as ProductType]));

  const orders = transactions.map((t) => ({
    id: `seed-${t.orderId}`,
    customerId: `seed-${t.customerId}`,
    status: "DELIVERED" as const,
    totalAmount: t.total.toFixed(2),
    currency: "INR",
    paymentProvider: "seed",
    paymentRef: `seed:${t.orderId}`,
    createdAt: t.createdAt,
  }));

  const sellerOrders: { id: string; orderId: string; storeId: string; status: "DELIVERED"; subtotal: string; createdAt: Date }[] = [];
  const items: {
    orderId: string;
    sellerOrderId: string;
    listingId: string;
    titleSnapshot: string;
    priceSnapshot: string;
    quantity: number;
    productType: ProductType;
  }[] = [];

  for (const t of transactions) {
    const perStore = new Map<string, number>();
    for (const it of t.items) {
      const storeId = storeOf.get(it.listingId)!;
      perStore.set(storeId, (perStore.get(storeId) ?? 0) + it.quantity * it.unitPrice);
      items.push({
        orderId: `seed-${t.orderId}`,
        sellerOrderId: `seed-${t.orderId}-${storeId}`,
        listingId: it.listingId,
        titleSnapshot: it.title,
        priceSnapshot: it.unitPrice.toFixed(2),
        quantity: it.quantity,
        productType: typeOf.get(it.listingId)!,
      });
    }
    for (const [storeId, subtotal] of perStore) {
      sellerOrders.push({
        id: `seed-${t.orderId}-${storeId}`,
        orderId: `seed-${t.orderId}`,
        storeId,
        status: "DELIVERED",
        subtotal: subtotal.toFixed(2),
        createdAt: t.createdAt,
      });
    }
  }

  for (const part of chunk(orders)) await prisma.order.createMany({ data: part, skipDuplicates: true });
  for (const part of chunk(sellerOrders)) await prisma.sellerOrder.createMany({ data: part, skipDuplicates: true });
  for (const part of chunk(items)) await prisma.orderItem.createMany({ data: part, skipDuplicates: true });
  console.log(`Order history ready: ${orders.length} orders.`);
}

async function main() {
  await seedCatalogue();
  await seedOrderHistory();
  const mall = await seedMall();
  await seedMallActivity(mall);
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
