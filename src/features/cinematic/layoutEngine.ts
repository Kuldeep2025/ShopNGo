/**
 * Cinematic layout engine – weight-based row shuffle for home.
 * Uses session signals + controlled randomness. Persists last layout to avoid CLS.
 */

export type LifestyleTag = "fitness" | "tech" | "home" | "study" | "general";

export type RowKind =
  | "hero_banner"
  | "continue_browsing"
  | "trending"
  | "category_rail"
  | "vertical_collection"
  | "value_props"
  | "journey"
  | "cta_band";

export type LayoutRow = {
  id: string;
  kind: RowKind;
  /** Optional category slug bias for category_rail */
  categoryHint?: string;
  weight: number;
};

const STORAGE_LAYOUT = "shopngo_cinematic_layout_v1";
const STORAGE_SESSION = "shopngo_cinematic_session_v1";

export type SessionSignals = {
  visitCount: number;
  lastHour: number;
  viewedCategories: string[];
  lifestyleTag: LifestyleTag;
};

function hourBucket(h: number): "morning" | "afternoon" | "evening" | "night" {
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

/** Deterministic-ish hash for stable randomness per session seed */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function readSession(): SessionSignals {
  if (typeof window === "undefined") {
    return {
      visitCount: 1,
      lastHour: new Date().getHours(),
      viewedCategories: [],
      lifestyleTag: "general",
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_SESSION);
    if (!raw) {
      const initial: SessionSignals = {
        visitCount: 1,
        lastHour: new Date().getHours(),
        viewedCategories: [],
        lifestyleTag: "general",
      };
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as SessionSignals;
    parsed.visitCount = (parsed.visitCount ?? 0) + 1;
    parsed.lastHour = new Date().getHours();
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(parsed));
    return parsed;
  } catch {
    return {
      visitCount: 1,
      lastHour: new Date().getHours(),
      viewedCategories: [],
      lifestyleTag: "general",
    };
  }
}

export function trackCategoryView(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const s = readSession();
    const next = [slug, ...s.viewedCategories.filter((c) => c !== slug)].slice(0, 8);
    // Infer lifestyle from category names
    let tag: LifestyleTag = s.lifestyleTag;
    const lower = slug.toLowerCase();
    if (/phone|laptop|electronic|tech/.test(lower)) tag = "tech";
    else if (/sport|fitness|gym/.test(lower)) tag = "fitness";
    else if (/home|living|bed|furniture/.test(lower)) tag = "home";
    else if (/book|note|course|study/.test(lower)) tag = "study";
    const updated: SessionSignals = {
      ...s,
      viewedCategories: next,
      lifestyleTag: tag,
    };
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

function baseRows(): LayoutRow[] {
  return [
    { id: "hero", kind: "hero_banner", weight: 100 },
    { id: "trending", kind: "trending", weight: 80 },
    { id: "continue", kind: "continue_browsing", weight: 70 },
    { id: "rail_electronics", kind: "category_rail", categoryHint: "electronics", weight: 60 },
    { id: "rail_courses", kind: "category_rail", categoryHint: "courses", weight: 55 },
    { id: "vertical", kind: "vertical_collection", weight: 50 },
    { id: "values", kind: "value_props", weight: 40 },
    { id: "journey", kind: "journey", weight: 35 },
    { id: "cta", kind: "cta_band", weight: 30 },
  ];
}

/**
 * Score and order rows. Hero stays first; CTA prefers last.
 * Other rows shuffle by weight + session + randomness.
 */
export function computeLayout(signals: SessionSignals): LayoutRow[] {
  const hour = hourBucket(signals.lastHour);
  const rand = seededRandom(
    signals.visitCount * 997 + signals.lastHour * 13 + signals.viewedCategories.length * 31
  );

  const rows = baseRows().map((row) => {
    let w = row.weight;

    // Hour bias
    if (hour === "evening" && row.kind === "trending") w += 15;
    if (hour === "morning" && row.kind === "category_rail") w += 10;
    if (hour === "night" && row.kind === "vertical_collection") w += 12;

    // Visit depth – returning users see continue_browsing higher
    if (signals.visitCount > 2 && row.kind === "continue_browsing") w += 20;

    // Category affinity
    if (
      row.kind === "category_rail" &&
      row.categoryHint &&
      signals.viewedCategories.some((c) => c.includes(row.categoryHint!))
    ) {
      w += 25;
    }

    // Lifestyle
    if (signals.lifestyleTag === "tech" && row.categoryHint === "electronics") w += 18;
    if (signals.lifestyleTag === "study" && row.categoryHint === "courses") w += 18;

    // Controlled randomness (±12%)
    w *= 0.88 + rand() * 0.24;

    return { ...row, weight: w };
  });

  const hero = rows.find((r) => r.kind === "hero_banner")!;
  const cta = rows.find((r) => r.kind === "cta_band")!;
  const middle = rows
    .filter((r) => r.kind !== "hero_banner" && r.kind !== "cta_band")
    .sort((a, b) => b.weight - a.weight);

  return [hero, ...middle, cta];
}

export function persistLayout(rows: LayoutRow[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_LAYOUT,
      JSON.stringify({ rows, savedAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

export function readPersistedLayout(): LayoutRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_LAYOUT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows: LayoutRow[] };
    return parsed.rows ?? null;
  } catch {
    return null;
  }
}

/**
 * Pick media / visual variant from product attributes by lifestyle tag.
 */
export function pickArtworkVariant(
  product: {
    title: string;
    productType: string;
    attributes?: unknown;
    media?: unknown;
  },
  tag: LifestyleTag
): { emoji: string; gradient: string; label?: string } {
  const attrs = product.attributes && typeof product.attributes === "object" && !Array.isArray(product.attributes)
    ? (product.attributes as Record<string, unknown>)
    : {};
  const media = Array.isArray(product.media)
    ? product.media.filter((item): item is { url: string; alt?: string } =>
        !!item && typeof item === "object" && "url" in item && typeof item.url === "string"
      )
    : [];

  // Prefer explicit lifestyle media keys if present
  if (media.length > 0) {
    const preferred =
      media.find((m) =>
        (m.alt ?? "").toLowerCase().includes(tag === "general" ? "" : tag)
      ) ?? media[0];
    if (preferred?.url) {
      return {
        emoji: "🖼️",
        gradient: "from-zinc-800 to-zinc-900",
        label: preferred.alt,
      };
    }
  }

  // Attribute-driven
  const style = String(attrs.style ?? attrs.variant ?? "").toLowerCase();
  const title = product.title.toLowerCase();
  if (/earbud|headphone|speaker|audio/.test(title)) {
    return { emoji: "🎧", gradient: "from-indigo-900/90 to-sky-900" };
  }
  if (/bedsheet|bed|home|living/.test(title)) {
    return { emoji: "🛏️", gradient: "from-amber-900/80 to-rose-950" };
  }
  if (/resume|review|consult|service/.test(title)) {
    return { emoji: "✍️", gradient: "from-violet-900/80 to-fuchsia-950" };
  }
  if (tag === "fitness" || style.includes("athletic")) {
    return { emoji: "🏃", gradient: "from-emerald-900/80 to-zinc-900" };
  }
  if (tag === "tech" || style.includes("sleek") || product.productType === "DIGITAL") {
    return { emoji: "💻", gradient: "from-indigo-900/80 to-zinc-900" };
  }
  if (tag === "home") {
    return { emoji: "🏠", gradient: "from-amber-900/60 to-zinc-900" };
  }
  if (tag === "study" || ["EBOOK", "E_NOTE", "COURSE"].includes(product.productType)) {
    return { emoji: "📚", gradient: "from-sky-900/70 to-zinc-900" };
  }
  if (product.productType === "SERVICE") {
    return { emoji: "✨", gradient: "from-violet-900/70 to-zinc-900" };
  }
  return { emoji: "📦", gradient: "from-zinc-800 to-zinc-950" };
}
