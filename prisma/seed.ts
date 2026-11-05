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
import { PrismaClient, type ProductType } from "@prisma/client";
import { DEMO_CATEGORIES, DEMO_LISTINGS } from "../src/lib/demo-data";
import { generateSampleTransactions } from "../src/features/analytics/sampleData";

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

  const chunk = <T,>(arr: T[], n = 1000) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
  for (const part of chunk(orders)) await prisma.order.createMany({ data: part, skipDuplicates: true });
  for (const part of chunk(sellerOrders)) await prisma.sellerOrder.createMany({ data: part, skipDuplicates: true });
  for (const part of chunk(items)) await prisma.orderItem.createMany({ data: part, skipDuplicates: true });
  console.log(`Order history ready: ${orders.length} orders.`);
}

async function main() {
  await seedCatalogue();
  await seedOrderHistory();
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
