/**
 * Live product lookup for one shopper question.
 * Reads the database at question time (so a product listed a second ago is found), understands
 * synonyms in English, Hindi script and Roman Hindi, and returns only the few listings that answer
 * the question, in the evidence format the assistant reads. Nothing here is ever cached.
 */
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { computeEffectivePrice } from "@/features/pricing/effectivePrice";
import { budgetFrom } from "./directAnswer";
import { rank, understand, type Candidate, type Concept } from "./queryUnderstanding";

const visible = { status: "APPROVED" as const, store: { isActive: true } };
const GENERIC_STORE_WORDS = new Set(["store", "stores", "shop", "shops", "tech", "mart", "market", "electronics", "the", "and", "hub", "world", "point", "center", "centre", "services", "service", "academy", "pantry", "home", "fitness"]);

type StoreRow = { id: string; name: string; slug: string };

/** Which store (if any) the question is about: named in the question, or the store page the shopper is on. */
export function pickStore(question: string, stores: StoreRow[], page?: string): StoreRow | null {
  const q = question.toLowerCase();
  const words = new Set(q.split(/[^a-z0-9]+/).filter(Boolean));
  const named = stores.find((s) => q.includes(s.name.toLowerCase()))
    ?? stores.find((s) => {
      const first = s.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !GENERIC_STORE_WORDS.has(w))[0];
      return first ? words.has(first) : false;
    });
  if (named) return named;
  const m = page?.match(/^\/stores\/([^/?#]+)/);
  if (m && /\b(is|iss|this|yeh|ye|yahan|yaha|yahaan|here)\b.*\b(store|shop|dukan|dukaan|site)\b|\b(yahan|yaha|here)\b|\b(store|shop|dukan)\b.*\b(me|mein|has|sell|sells|milta|milti)\b/i.test(q)) {
    return stores.find((s) => s.slug === decodeURIComponent(m[1]!)) ?? null;
  }
  return null;
}

const money = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function snippet(c: Candidate, tag?: string): string {
  return [
    `Title: ${c.title}`,
    `Category: ${c.category || "N/A"}`,
    `Price: ${c.currency ?? "INR"} ${money(c.price)}`,
    `Stock: ${c.stock ?? "n/a"}`,
    `Store: ${c.store}`,
    ...(tag ? [`Rank: ${tag}`] : []),
    ...(c.description ? [`Description: ${c.description.slice(0, 160)}`] : []),
  ].join("\n");
}

async function storeOverview(store: StoreRow): Promise<string> {
  if (!prisma) return "";
  const groups = await prisma.listing.groupBy({ by: ["categoryId"], where: { ...visible, storeId: store.id }, _count: { _all: true } });
  const cats = await prisma.category.findMany({ where: { id: { in: groups.map((g) => g.categoryId).filter((x): x is string => Boolean(x)) } }, select: { id: true, name: true } });
  const name = new Map(cats.map((c) => [c.id, c.name]));
  const total = groups.reduce((n, g) => n + g._count._all, 0);
  const list = groups
    .map((g) => ({ n: (g.categoryId && name.get(g.categoryId)) || "Other", c: g._count._all }))
    .sort((a, b) => b.c - a.c)
    .slice(0, 12)
    .map((x) => `${x.n} (${x.c})`)
    .join(", ");
  return `Store: ${store.name}\nLive products: ${total}\nWhat it sells (category and count): ${list || "nothing yet"}`;
}

/** Product evidence for the question, newest data from the database. Empty when nothing relevant exists. */
export async function retrieveEvidence(question: string, page?: string): Promise<string[]> {
  if (!isDatabaseConfigured() || !prisma) return [];
  const out: string[] = [];
  const stores = await prisma.store.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true }, take: 300 });
  const store = pickStore(question, stores, page);

  const u = understand(question);
  let concepts: Concept[] = u.concepts;
  if (store) {
    const storeWords = new Set(store.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    concepts = concepts.filter((c) => !storeWords.has(c.word));
  }

  if (concepts.length === 0) {
    if (store) out.push(await storeOverview(store));
    return out.filter(Boolean);
  }

  const budget = budgetFrom(question);
  const terms = Array.from(new Set(concepts.flatMap((c) => c.terms))).filter((t) => t.length >= 2).slice(0, 40);
  const rows = await prisma.listing.findMany({
    where: {
      ...visible,
      ...(store ? { storeId: store.id } : {}),
      ...(budget !== null ? { price: { lte: budget } } : {}),
      OR: terms.flatMap((t) => {
        // Short terms ("bud", "tv", "iem") would match inside unrelated words ("Budget", "Premium")
        // and crowd out the real products, so they must start a word.
        const text = (field: "title" | "name") => (t.length >= 4
          ? [{ [field]: { contains: t, mode: "insensitive" as const } }]
          : [{ [field]: { startsWith: t, mode: "insensitive" as const } }, { [field]: { contains: ` ${t}`, mode: "insensitive" as const } }]);
        return [
          ...text("title"),
          ...text("name").map((name) => ({ category: name })),
          ...text("name").map((name) => ({ category: { parent: name } })),
        ];
      }),
    },
    select: {
      id: true, title: true, description: true, price: true, currency: true, stock: true,
      mrp: true, saleEnabled: true, salePrice: true, saleStartsAt: true, saleEndsAt: true,
      store: { select: { name: true } },
      category: { select: { name: true, parent: { select: { name: true } } } },
    },
    orderBy: u.wantsCheapest ? { price: "asc" } : u.wantsPriciest ? { price: "desc" } : { createdAt: "desc" },
    take: 800,
  });

  const cands = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category?.name ?? "",
    parentCategory: r.category?.parent?.name ?? "",
    store: r.store.name,
    price: Number(computeEffectivePrice(r).unitPrice),
    currency: r.currency,
    stock: r.stock,
  }));
  const ranked = rank(cands, { ...u, concepts });
  const asked = concepts.map((c) => (c.terms.length > 1 ? `${c.word} (also ${c.terms.filter((t) => t !== c.word).slice(0, 6).join(", ")})` : c.word)).join("; ");

  const head = [
    "Search: live database, read just now",
    `Asked about: ${asked}${store ? ` in store ${store.name}` : ""}${budget !== null ? `, budget up to Rs ${budget}` : ""}`,
    `Kind: ${u.wantsCheapest ? "cheapest" : u.wantsPriciest ? "priciest" : "match"}`,
    `Match quality: ${ranked.quality}${ranked.quality === "exact" ? " (every asked word is in the product names)" : ranked.quality === "none" ? " (no product matches)" : ""}`,
    `Matching products: ${ranked.matched}`,
    ...(ranked.missing.length ? [`No product is called or categorised as: ${ranked.missing.join(", ")}. Say so briefly, then offer the closest items below.`] : []),
  ].join("\n");
  out.push(head);
  ranked.picks.slice(0, u.wantsCheapest || u.wantsPriciest ? 4 : 5).forEach((p, i) => {
    out.push(snippet(p, i === 0 && (u.wantsCheapest || u.wantsPriciest) ? (u.wantsCheapest ? "CHEAPEST MATCH" : "MOST EXPENSIVE MATCH") : i === 0 ? "BEST MATCH" : undefined));
  });
  if (store && ranked.picks.length === 0) out.push(await storeOverview(store));
  return out;
}
