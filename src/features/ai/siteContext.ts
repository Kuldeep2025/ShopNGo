/**
 * Everything the assistant is allowed to know about ShopNGo.
 * Static part: what the website is, its pages, roles and team (kept next to the About page data).
 * Live part: counts and category/store lists read from the database at question time.
 */
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { PROJECT_TAGLINE, PROJECT_TITLE, TEAM } from "@/features/about/team";

export const SITE_KNOWLEDGE = `
ABOUT THE WEBSITE
${PROJECT_TITLE} is an online shopping website and a minor project, an academic project built during the final year of a BCA course. Tagline: "${PROJECT_TAGLINE}".
It is a multi-seller marketplace with a mall catalogue of 2230 products (clothing, electronics, grocery, home, beauty, toys, books and more), each with a description and an image.
Payments are a demo (mock) payment for now, so no real money moves. It works as an installable app (PWA) with an offline page, supports dark mode, and is built to work with screen readers and keyboards.
Tech: Next.js, React and TypeScript, Tailwind CSS, PostgreSQL with Prisma, Firebase sign-in, OpenStreetMap for free maps, and a free AI model with grounded answers.

PAGES AND WHAT THEY DO
- Home: highlights, "Picked for you" suggestions.
- Search (/search): find products by name, category and price. Categories (/categories) and Stores (/stores) list them too.
- Product page: details, price, stock, reviews and ratings, "frequently bought together", and Add to cart.
- Compare: put products side by side.
- Cart and Checkout: review items, pick an address, place the order.
- Orders: history and live status. When a delivery partner has the order, the order page shows a live map, distance and ETA.
- Account (/account): profile and saved addresses.
- About (/about): the team and what each person built.
- Seller pages: apply at /seller/apply, then manage products at /seller/listings and orders at /seller/orders.
- Delivery pages: apply at /delivery/apply ("Become a delivery partner"), then /delivery to go online, share location, accept nearby orders, mark picked up and delivered.
- Moderator pages: Control centre (/moderator/activity) shows new requests and recent activity, /moderator/applications reviews seller and delivery applications, /moderator/listings reviews listings, /insights shows analytics.
- Ask ShopNGo: this assistant.

HOW THINGS WORK
- Sign in: with email and password, Google or phone. Signing in creates a customer account automatically.
- Ratings and reviews: a signed-in customer who has bought a product can rate it 1 to 5 stars with a review on that product's page. Only verified buyers can review.
- Personalised suggestions: "Picked for you" uses the categories and stores of what a customer bought and rated highly, skips what they already own and lowers categories they rated poorly. Without history it shows best-rated items. Product pages also show "Frequently bought together", mined from real orders.
- Becoming a seller: apply with business details; a moderator reviews and approves. After approval, add listings; listings are reviewed before going live.
- Becoming a delivery partner: any signed-in person can apply; the application is approved and the Deliver option opens the delivery page. Partners go online, share location (only while online), and accept orders near them. Location uses the phone's GPS, OpenStreetMap and straight-line distance, with an estimate at about 22 km/h. It is all free.
- Moderator and admin: the site owner's account (kuldbehera@gmail.com) is the admin and moderator. Moderators approve sellers, delivery partners and listings, and see the Control centre.
- Roles: customer, seller, delivery partner, moderator, admin. Roles are checked on the server.

THE TEAM (three students, no overlap in roles)
${TEAM.map((m) => `- ${m.name}: ${m.role}. ${m.contributions.join("; ")}.`).join("\n")}
In short: Jaskaran Singh did the project name, architecture, page flow, component connections and all CSS and frontend. Kuldeep Behera and Pankaj Gupta split the backend, authentication, AI integration, testing, automation and deployment. The page /about shows this in full.
`.trim();

export async function liveSiteSnapshot(): Promise<string> {
  if (!isDatabaseConfigured() || !prisma) return "LIVE DATA: not available right now.";
  try {
    const [products, stores, categories, sellers, partners, orders, reviews, topCats, topStores] = await Promise.all([
      prisma.listing.count({ where: { status: "APPROVED" } }),
      prisma.store.count({ where: { isActive: true } }),
      prisma.category.count(),
      prisma.user.count({ where: { roles: { has: "SELLER" } } }),
      prisma.deliveryPartner.count(),
      prisma.order.count(),
      prisma.review.count(),
      prisma.category.findMany({
        select: { name: true, _count: { select: { listings: { where: { status: "APPROVED" } } } } },
        orderBy: { name: "asc" },
        take: 60,
      }),
      prisma.store.findMany({
        where: { isActive: true },
        select: { name: true, _count: { select: { listings: { where: { status: "APPROVED" } } } } },
        take: 30,
      }),
    ]);
    return [
      "LIVE DATA (read just now):",
      `Live products: ${products}. Active stores: ${stores}. Categories: ${categories}. Sellers: ${sellers}. Delivery partners: ${partners}. Orders placed: ${orders}. Reviews: ${reviews}.`,
      `Categories with product counts: ${topCats.map((c) => `${c.name} (${c._count.listings})`).join(", ") || "none"}.`,
      `Stores: ${topStores.map((s) => `${s.name} (${s._count.listings})`).join(", ") || "none"}.`,
    ].join("\n");
  } catch {
    return "LIVE DATA: not available right now.";
  }
}
