/**
 * ShopNGo recommendation engine. Pure functions only (no database, no clock unless passed in),
 * so every rule can be unit tested.
 *
 * Pipeline: signals -> interest profile (time decayed) -> candidate scoring
 * (content similarity + collaborative filtering + popularity prior) -> exploration share
 * -> diversity re-ranking (MMR style with rolling per-category and per-store caps).
 */

export type SignalKind = "VIEW" | "SEARCH" | "CART" | "LIKE" | "DISMISS" | "PURCHASE" | "REVIEW";

export const HALF_LIFE_DAYS = 14;
const DAY_MS = 86_400_000;

/** Base strength of each kind of signal. Purchases are the strongest, dismissals the most negative. */
export const BASE_WEIGHTS = {
  PURCHASE: 5,
  LIKE: 3.5,
  CART: 3,
  SEARCH: 1.2,
  VIEW: 1,
  DISMISS: -6,
} as const;

export type Item = {
  id: string;
  title: string;
  categoryId: string | null;
  categoryName: string;
  categorySlug: string;
  parentId: string | null;
  parentSlug: string | null;
  storeId: string;
  storeName: string;
  brand: string | null;
  price: number;
  inStock: boolean;
  avgRating: number;
  ratingCount: number;
  createdAt: number;
  /** 0..1 share of recent interest across all shoppers. */
  trend?: number;
};

export type Signal = {
  kind: SignalKind;
  at: number;
  productId?: string;
  query?: string;
  /** Overrides the base weight (views use it for time spent on the page). */
  weight?: number;
  /** Star rating for REVIEW signals. */
  rating?: number;
};

export type Source = { kind: SignalKind; title: string; weight: number; query?: string };

export type Profile = {
  categories: Map<string, number>;
  parents: Map<string, number>;
  stores: Map<string, number>;
  brands: Map<string, number>;
  tokens: Map<string, number>;
  /** Decayed weight of each positively signalled product, used as seeds for collaborative filtering. */
  seeds: Map<string, number>;
  price: { low: number; high: number; median: number } | null;
  positiveMass: number;
  purchased: Set<string>;
  dismissed: Set<string>;
  liked: Set<string>;
  sources: Map<string, Source>;
  searchSources: Map<string, Source>;
};

export function decay(ageMs: number, halfLifeDays = HALF_LIFE_DAYS): number {
  const days = Math.max(0, ageMs) / DAY_MS;
  return Math.pow(0.5, days / halfLifeDays);
}

const STOP = new Set([
  "the", "and", "for", "with", "pack", "from", "your", "you", "this", "that", "new", "set", "ml", "gm", "kg", "pcs",
]);

export function tokenize(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP.has(raw) || /^\d+$/.test(raw)) continue;
    let t = raw;
    if (t.length > 4 && t.endsWith("ies")) t = `${t.slice(0, -3)}y`;
    else if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) t = t.slice(0, -1);
    out.add(t);
  }
  return [...out];
}

export function itemTokens(item: Item): string[] {
  return tokenize(`${item.title} ${item.categoryName} ${item.brand ?? ""}`);
}

/** Strength of one signal before time decay. Negative means "show me less of this". */
export function signalWeight(s: Signal): number {
  if (s.kind === "REVIEW") {
    const r = s.rating ?? 3;
    if (r >= 4) return 2.5 + (r - 4);
    if (r <= 2) return -(3.5 + (2 - r) * 1.5);
    return 0;
  }
  if (typeof s.weight === "number" && Number.isFinite(s.weight)) {
    if (s.kind === "DISMISS") return -Math.abs(s.weight);
    return s.weight;
  }
  return BASE_WEIGHTS[s.kind];
}

function bump(map: Map<string, number>, key: string | null | undefined, delta: number) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + delta);
}

function weightedQuantile(points: { v: number; w: number }[], q: number): number {
  const sorted = [...points].sort((a, b) => a.v - b.v);
  const total = sorted.reduce((s, p) => s + p.w, 0);
  let acc = 0;
  for (const p of sorted) {
    acc += p.w;
    if (acc >= q * total) return p.v;
  }
  return sorted[sorted.length - 1]!.v;
}

export function buildProfile(signals: Signal[], items: Map<string, Item>, now: number): Profile {
  const p: Profile = {
    categories: new Map(),
    parents: new Map(),
    stores: new Map(),
    brands: new Map(),
    tokens: new Map(),
    seeds: new Map(),
    price: null,
    positiveMass: 0,
    purchased: new Set(),
    dismissed: new Set(),
    liked: new Set(),
    sources: new Map(),
    searchSources: new Map(),
  };
  const prices: { v: number; w: number }[] = [];

  for (const s of signals) {
    const raw = signalWeight(s);
    const w = raw * decay(now - s.at);
    const item = s.productId ? items.get(s.productId) : undefined;

    if (s.kind === "PURCHASE" && s.productId) p.purchased.add(s.productId);
    if (s.kind === "DISMISS" && s.productId) p.dismissed.add(s.productId);
    if (s.kind === "LIKE" && s.productId) p.liked.add(s.productId);

    if (s.kind === "SEARCH") {
      const toks = tokenize(s.query ?? "");
      if (w > 0 && toks.length) {
        for (const t of toks) bump(p.tokens, t, w);
        p.positiveMass += w;
        const q = (s.query ?? "").trim();
        for (const t of toks) {
          const prev = p.searchSources.get(t);
          if (!prev || prev.weight < w) p.searchSources.set(t, { kind: "SEARCH", title: q, weight: w, query: q });
        }
      }
      continue;
    }
    if (!item || w === 0) continue;

    if (w > 0) {
      p.positiveMass += w;
      bump(p.categories, item.categoryId, w);
      bump(p.parents, item.parentId, w * 0.4);
      bump(p.stores, item.storeId, w * 0.5);
      bump(p.brands, item.brand?.toLowerCase(), w * 0.7);
      for (const t of itemTokens(item)) bump(p.tokens, t, w);
      bump(p.seeds, item.id, w);
      if (item.price > 0) prices.push({ v: Math.log(item.price), w });
      const key = item.categoryId ?? item.id;
      const prev = p.sources.get(key);
      if (!prev || prev.weight < w) p.sources.set(key, { kind: s.kind, title: item.title, weight: w });
    } else {
      bump(p.categories, item.categoryId, w);
      bump(p.parents, item.parentId, w * 0.2);
      bump(p.stores, item.storeId, w * 0.25);
      bump(p.brands, item.brand?.toLowerCase(), w * 0.5);
      for (const t of itemTokens(item)) bump(p.tokens, t, w * 0.4);
    }
  }

  if (prices.length) {
    const lo = weightedQuantile(prices, 0.2);
    const hi = weightedQuantile(prices, 0.8);
    const med = weightedQuantile(prices, 0.5);
    p.price = { low: Math.exp(lo), high: Math.exp(hi), median: Math.exp(med) };
  }
  return p;
}

// ---------- collaborative filtering ----------

export type Cooccurrence = {
  sim(a: string, b: string): number;
  neighbors(id: string, k?: number): { id: string; sim: number }[];
};

/**
 * Item to item cosine similarity from baskets. A basket is the set of products one order contains,
 * or the set of products one shopper bought, saved, carted or viewed.
 */
export function buildCooccurrence(baskets: string[][], maxBasket = 30): Cooccurrence {
  const pop = new Map<string, number>();
  const counts = new Map<string, Map<string, number>>();
  for (const raw of baskets) {
    const basket = [...new Set(raw)].slice(0, maxBasket);
    for (const a of basket) pop.set(a, (pop.get(a) ?? 0) + 1);
    for (let i = 0; i < basket.length; i++) {
      for (let j = 0; j < basket.length; j++) {
        if (i === j) continue;
        const a = basket[i]!;
        const b = basket[j]!;
        let row = counts.get(a);
        if (!row) counts.set(a, (row = new Map()));
        row.set(b, (row.get(b) ?? 0) + 1);
      }
    }
  }
  const sim = (a: string, b: string) => {
    const c = counts.get(a)?.get(b) ?? 0;
    if (!c) return 0;
    return c / Math.sqrt((pop.get(a) ?? 1) * (pop.get(b) ?? 1));
  };
  return {
    sim,
    neighbors(id, k = 20) {
      const row = counts.get(id);
      if (!row) return [];
      return [...row.keys()]
        .map((b) => ({ id: b, sim: sim(id, b) }))
        .sort((x, y) => y.sim - x.sim)
        .slice(0, k);
    },
  };
}

// ---------- scoring ----------

export type Kind = "personal" | "similar-users" | "explore" | "popular";

export type Recommendation = {
  id: string;
  score: number;
  kind: Kind;
  reason: string;
  parts: { content: number; cf: number; prior: number; price: number };
};

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Popularity and quality prior: Bayesian average rating, review volume, freshness, trend. */
export function priorScore(item: Item, now: number): number {
  const m = 3.6;
  const c = 4;
  const bayes = (c * m + item.ratingCount * item.avgRating) / (c + item.ratingCount);
  const quality = Math.min(1, Math.max(0, (bayes - 1) / 4));
  const volume = Math.min(1, Math.log(1 + item.ratingCount) / Math.log(51));
  const ageDays = Math.max(0, now - item.createdAt) / DAY_MS;
  const fresh = Math.exp(-ageDays / 60);
  const trend = Math.min(1, Math.max(0, item.trend ?? 0));
  return 0.5 * quality + 0.2 * volume + 0.1 * fresh + 0.2 * trend;
}

function norm(map: Map<string, number>): (k: string | null | undefined) => number {
  let max = 0;
  for (const v of map.values()) if (v > max) max = v;
  return (k) => {
    if (!k || max <= 0) return 0;
    const v = map.get(k) ?? 0;
    return v >= 0 ? Math.min(1, v / max) : Math.max(-1, v / max);
  };
}

function priceFit(price: number, band: Profile["price"]): number {
  if (!band || price <= 0) return 0.5;
  const lo = Math.log(band.low) - 0.15;
  const hi = Math.log(band.high) + 0.15;
  const x = Math.log(price);
  const d = x < lo ? lo - x : x > hi ? x - hi : 0;
  return Math.exp(-Math.pow(d / 0.7, 2));
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  if (!na || !nb) return 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [k, v] of small) {
    const o = big.get(k);
    if (o) dot += v * o;
  }
  return dot / Math.sqrt(na * nb);
}

function short(title: string, n = 42): string {
  return title.length > n ? `${title.slice(0, n - 1).trimEnd()}…` : title;
}

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export type RankOptions = {
  limit: number;
  now: number;
  exclude?: Set<string>;
  filter?: (item: Item) => boolean;
  cooc?: Cooccurrence;
  /** 0 to 1, share of slots reserved for adjacent categories. */
  explorationShare?: number;
  /** Varies tie breaking, e.g. the date, so feeds do not look frozen. */
  seed?: string;
  /** Rolling window for the diversity caps. */
  window?: number;
  maxPerCategoryInWindow?: number;
  maxPerStoreInWindow?: number;
};

type Scored = {
  item: Item;
  score: number;
  content: number;
  cf: number;
  cfSource?: string;
  prior: number;
  price: number;
  catSim: number;
  catAff: number;
  cos: number;
  tokens: Set<string>;
  suppressed: boolean;
};

export function rank(candidates: Item[], profile: Profile, itemsById: Map<string, Item>, opts: RankOptions): Recommendation[] {
  const { now, limit } = opts;
  const pool = candidates.filter(
    (c) =>
      c.inStock &&
      !profile.purchased.has(c.id) &&
      !profile.dismissed.has(c.id) &&
      !opts.exclude?.has(c.id) &&
      (!opts.filter || opts.filter(c))
  );
  if (pool.length === 0 || limit <= 0) return [];

  // Inverse document frequency over the candidate pool.
  const df = new Map<string, number>();
  const toks = new Map<string, Set<string>>();
  for (const c of pool) {
    const t = new Set(itemTokens(c));
    toks.set(c.id, t);
    for (const k of t) df.set(k, (df.get(k) ?? 0) + 1);
  }
  const idf = (t: string) => Math.log(1 + pool.length / (1 + (df.get(t) ?? 0)));
  const profVec = new Map<string, number>();
  for (const [t, w] of profile.tokens) if (w > 0 && df.has(t)) profVec.set(t, w * idf(t));

  const catN = norm(profile.categories);
  const parN = norm(profile.parents);
  const storeN = norm(profile.stores);
  const brandN = norm(profile.brands);
  const strength = Math.min(1, profile.positiveMass / 6);

  // Collaborative filtering: neighbours of the shopper's own positive items.
  let maxSeed = 0;
  for (const w of profile.seeds.values()) if (w > maxSeed) maxSeed = w;
  const cfRaw = new Map<string, { v: number; src?: string; best: number }>();
  if (opts.cooc && maxSeed > 0) {
    for (const [seedId, w] of profile.seeds) {
      for (const n of opts.cooc.neighbors(seedId, 40)) {
        const cur = cfRaw.get(n.id) ?? { v: 0, best: 0 };
        const add = (w / maxSeed) * n.sim;
        cur.v += add;
        if (add > cur.best) {
          cur.src = seedId;
          cur.best = add;
        }
        cfRaw.set(n.id, cur);
      }
    }
  }
  let maxCf = 0;
  for (const v of cfRaw.values()) if (v.v > maxCf) maxCf = v.v;

  const scored: Scored[] = pool.map((item) => {
    const catAff = catN(item.categoryId);
    const catSim = Math.max(Math.max(0, catAff), 0.4 * Math.max(0, parN(item.parentId)));
    const cos = Math.min(1, cosine(profVec, new Map([...(toks.get(item.id) ?? [])].map((t) => [t, idf(t)]))));
    const bs = Math.max(0, brandN(item.brand?.toLowerCase()), 0.5 * storeN(item.storeId));
    const pf = priceFit(item.price, profile.price);
    const content = 0.4 * catSim + 0.25 * cos + 0.15 * bs + 0.2 * pf * (0.3 + 0.7 * Math.min(1, catSim + cos));
    const cfEntry = cfRaw.get(item.id);
    const cf = maxCf > 0 && cfEntry ? Math.min(1, cfEntry.v / maxCf) : 0;
    const prior = priorScore(item, now);
    let score = strength * (0.5 * content + 0.2 * cf + 0.3 * prior) + (1 - strength) * prior;
    // Negative signals: a disliked category or brand is pushed far down, not just ignored.
    let suppressed = false;
    if (catAff < -0.05 || (profile.categories.get(item.categoryId ?? "") ?? 0) < -0.5) {
      score *= 0.15;
      suppressed = true;
    }
    if ((profile.brands.get(item.brand?.toLowerCase() ?? "") ?? 0) < -0.5) score *= 0.6;
    score += (hash01(`${item.id}:${opts.seed ?? ""}`) - 0.5) * 0.02;
    return { item, score, content, cf, cfSource: cfEntry?.src, prior, price: pf, catSim, catAff, cos, tokens: toks.get(item.id)!, suppressed };
  });

  const byScore = [...scored].sort((a, b) => b.score - a.score);

  // Exploration: a small share from neighbouring categories the shopper has not tried much.
  const share = opts.explorationShare ?? 0.15;
  const exploreSlots = strength >= 0.3 && limit >= 6 ? Math.max(1, Math.round(limit * share)) : 0;
  const exploreCands = byScore
    .filter((s) => !s.suppressed && s.catAff < 0.3 && parN(s.item.parentId) > 0 && s.prior >= 0.3)
    .map((s) => ({ s, v: s.prior * 0.7 + hash01(`x${s.item.id}:${opts.seed ?? ""}`) * 0.3 }))
    .sort((a, b) => b.v - a.v)
    .map((x) => x.s);
  const exploreIds = new Set<string>();
  const exploreList: Scored[] = [];
  const exploreCats = new Set<string>();
  for (const s of exploreCands) {
    if (exploreList.length >= exploreSlots) break;
    if (exploreCats.has(s.item.categoryId ?? s.item.id)) continue;
    exploreCats.add(s.item.categoryId ?? s.item.id);
    exploreList.push(s);
    exploreIds.add(s.item.id);
  }

  // Diversity re-ranking (maximal marginal relevance) with rolling per-category and per-store caps.
  const mainTarget = limit - exploreList.length;
  const window = opts.window ?? 12;
  const capCat = opts.maxPerCategoryInWindow ?? 3;
  const capStore = opts.maxPerStoreInWindow ?? 3;
  const remaining = byScore.filter((s) => !exploreIds.has(s.item.id)).slice(0, 400);
  const picked: Scored[] = [];
  const catCount = new Map<string, number>();
  const storeCount = new Map<string, number>();

  const overlap = (a: Set<string>, b: Set<string>) => {
    if (!a.size || !b.size) return 0;
    let i = 0;
    for (const t of a) if (b.has(t)) i++;
    return i / (a.size + b.size - i);
  };

  while (picked.length < mainTarget && remaining.length) {
    const recent = picked.slice(-(window - 1));
    const rc = new Map<string, number>();
    const rs = new Map<string, number>();
    for (const r of recent) {
      rc.set(r.item.categoryId ?? "", (rc.get(r.item.categoryId ?? "") ?? 0) + 1);
      rs.set(r.item.storeId, (rs.get(r.item.storeId) ?? 0) + 1);
    }
    let bestIdx = -1;
    let bestVal = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i]!;
      if ((rc.get(c.item.categoryId ?? "") ?? 0) >= capCat) continue;
      if ((rs.get(c.item.storeId) ?? 0) >= capStore) continue;
      let sim = 0;
      for (const r of picked.slice(-8)) sim = Math.max(sim, overlap(c.tokens, r.tokens));
      const val =
        c.score -
        0.06 * (catCount.get(c.item.categoryId ?? "") ?? 0) -
        0.03 * (storeCount.get(c.item.storeId) ?? 0) -
        0.12 * sim;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) {
      // Caps cannot be met any more (small catalogue): relax them rather than return too few.
      bestIdx = 0;
    }
    const [chosen] = remaining.splice(bestIdx, 1);
    picked.push(chosen!);
    catCount.set(chosen!.item.categoryId ?? "", (catCount.get(chosen!.item.categoryId ?? "") ?? 0) + 1);
    storeCount.set(chosen!.item.storeId, (storeCount.get(chosen!.item.storeId) ?? 0) + 1);
  }

  // Interleave exploration picks evenly through the list.
  const ordered: Scored[] = [...picked];
  exploreList.forEach((e, i) => {
    const pos = Math.min(ordered.length, Math.floor(((i + 1) * (picked.length + exploreList.length)) / (exploreList.length + 1)));
    ordered.splice(pos, 0, e);
  });

  return ordered.slice(0, limit).map((s) => ({
    id: s.item.id,
    score: Math.round(s.score * 1000) / 1000,
    kind: exploreIds.has(s.item.id) ? "explore" : s.cf >= 0.5 && s.cf >= s.content ? "similar-users" : s.content > 0.25 ? "personal" : "popular",
    reason: reasonFor(s, profile, itemsById, exploreIds.has(s.item.id), now),
    parts: { content: round3(s.content), cf: round3(s.cf), prior: round3(s.prior), price: round3(s.price) },
  }));
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

function sourcePhrase(src: Source): string {
  switch (src.kind) {
    case "PURCHASE":
      return `Because you bought ${short(src.title)}`;
    case "CART":
      return `Because you added ${short(src.title)} to your cart`;
    case "LIKE":
      return `Because you saved ${short(src.title)}`;
    case "REVIEW":
      return `Because you rated ${short(src.title)} highly`;
    default:
      return `Because you looked at ${short(src.title)}`;
  }
}

function reasonFor(s: Scored, profile: Profile, itemsById: Map<string, Item>, explore: boolean, nowMs: number): string {
  const item = s.item;
  if (explore) return `Something new, close to what you like (${item.categoryName})`;
  if (s.cf >= 0.35 && s.cfSource) {
    const src = itemsById.get(s.cfSource);
    if (src) {
      return profile.purchased.has(src.id)
        ? `Popular with people who bought ${short(src.title)}`
        : `Shoppers who liked ${short(src.title)} also liked this`;
    }
  }
  if (s.catSim >= 0.3) {
    const cat = profile.sources.get(item.categoryId ?? "");
    if (cat) return sourcePhrase(cat);
    return `Matches your interest in ${item.categoryName}`;
  }
  if (s.cos >= 0.25) {
    let best: Source | undefined;
    for (const t of itemTokens(item)) {
      const ss = profile.searchSources.get(t);
      if (ss && (!best || ss.weight > best.weight)) best = ss;
    }
    if (best?.query) return `Matches your search for “${best.query}”`;
    return `Similar to things you have looked at`;
  }
  if (profile.price && s.price >= 0.9 && s.content > 0.05) {
    return `Matches your usual price range (${inr(profile.price.low)} to ${inr(profile.price.high)})`;
  }
  if ((item.trend ?? 0) >= 0.4) return "Trending now";
  if (item.ratingCount >= 2 && item.avgRating >= 4) return "Highly rated by customers";
  if ((nowMs - item.createdAt) / DAY_MS < 14) return "New on ShopNGo";
  return "Popular on ShopNGo";
}

// ---------- similar products (item to item) ----------

export function similarProducts(
  target: Item,
  candidates: Item[],
  cooc: Cooccurrence | undefined,
  opts: { limit: number; dismissed?: Set<string>; now: number }
): Recommendation[] {
  const tt = new Map(itemTokens(target).map((t) => [t, 1]));
  const raw = candidates
    .filter((c) => c.id !== target.id && c.inStock && !opts.dismissed?.has(c.id))
    .map((c) => {
      const cf = cooc ? cooc.sim(target.id, c.id) : 0;
      const sameCat = c.categoryId && c.categoryId === target.categoryId ? 1 : c.parentId && c.parentId === target.parentId ? 0.4 : 0;
      const cos = cosine(tt, new Map(itemTokens(c).map((t) => [t, 1])));
      const price = priceFit(c.price, { low: target.price * 0.7, high: target.price * 1.4, median: target.price });
      return { c, cf, sameCat, cos, price };
    });
  const maxCf = Math.max(0, ...raw.map((r) => r.cf));
  return raw
    .map((r) => {
      const cfN = maxCf > 0 ? r.cf / maxCf : 0;
      const score = 0.4 * cfN + 0.25 * r.sameCat + 0.2 * r.cos + 0.1 * r.price + 0.05 * priorScore(r.c, opts.now);
      return { ...r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit)
    .map((r) => ({
      id: r.c.id,
      score: round3(r.score),
      kind: r.cf > 0 ? ("similar-users" as const) : ("personal" as const),
      reason:
        r.cf > 0 && r.cf / (maxCf || 1) >= 0.3
          ? "Customers who viewed or bought this also liked it"
          : r.sameCat === 1
            ? `Similar item in ${r.c.categoryName}`
            : "Related to this product",
      parts: { content: round3(r.cos), cf: round3(r.cf), prior: round3(priorScore(r.c, opts.now)), price: round3(r.price) },
    }));
}
