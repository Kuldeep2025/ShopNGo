/**
 * Review analysis that works offline: average, rating spread, trend, common themes and quotes.
 * Pure functions, so the same code serves the API, the product page and the AI evidence.
 */

export type ReviewInput = { rating: number; title?: string | null; body?: string | null; createdAt: Date | string; author?: string | null };

export type Theme = { theme: string; positive: number; negative: number };

export type ReviewSummary = {
  count: number;
  average: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  trend: { direction: "improving" | "declining" | "steady" | "not enough reviews"; recentAverage: number | null; earlierAverage: number | null };
  positiveThemes: Theme[];
  negativeThemes: Theme[];
  quotes: { rating: number; text: string; author: string }[];
  few: boolean;
};

const THEMES: Record<string, string[]> = {
  "quality": ["quality", "build", "material", "finish", "premium", "sturdy", "durable", "durability", "gunvatta"],
  "price and value": ["price", "value", "worth", "money", "expensive", "affordable", "paisa", "sasta", "mehenga", "costly", "overpriced"],
  "delivery": ["delivery", "delivered", "shipping", "shipped", "arrived", "late", "courier", "packing", "packaging", "package"],
  "size and fit": ["size", "fit", "fitting", "tight", "loose", "small", "large", "length"],
  "comfort": ["comfort", "comfortable", "soft", "cosy", "cozy", "uncomfortable"],
  "design and look": ["design", "look", "looks", "style", "stylish", "colour", "color", "beautiful"],
  "performance": ["performance", "works", "working", "battery", "sound", "speed", "fast", "slow", "bass", "camera", "display"],
  "taste and freshness": ["taste", "tasty", "fresh", "flavour", "flavor", "stale", "smell"],
  "service and returns": ["service", "support", "refund", "return", "replacement", "seller"],
};

const POSITIVE = new Set([
  "good", "great", "excellent", "amazing", "love", "loved", "perfect", "nice", "best", "fast", "happy", "worth", "superb",
  "awesome", "comfortable", "sturdy", "durable", "beautiful", "premium", "soft", "fresh", "affordable", "recommend", "satisfied",
  "achha", "acha", "badhiya", "mast", "zabardast", "sasta", "stylish", "smooth", "value",
]);
const NEGATIVE = new Set([
  "bad", "poor", "worst", "broke", "broken", "late", "slow", "waste", "terrible", "disappointed", "disappointing", "defective",
  "damaged", "fake", "loose", "tight", "uncomfortable", "refund", "stale", "overpriced", "expensive", "cheap", "issue", "problem",
  "bekaar", "kharab", "mehenga", "costly", "faulty", "delay", "delayed", "torn", "leaking",
]);
const NEGATORS = new Set(["not", "no", "never", "nahi", "nahin", "na", "isnt", "wasnt", "dont", "didnt", "doesnt"]);

const words = (t: string) => t.toLowerCase().replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
const round1 = (n: number) => Math.round(n * 10) / 10;
const text = (r: ReviewInput) => [r.title, r.body].filter(Boolean).join(". ");

/** Positive minus negative word score for one sentence, flipping a word right after "not". */
function sentenceScore(ws: string[]): number {
  let score = 0;
  ws.forEach((w, i) => {
    const flip = NEGATORS.has(ws[i - 1] ?? "") || NEGATORS.has(ws[i - 2] ?? "");
    if (POSITIVE.has(w)) score += flip ? -1 : 1;
    else if (NEGATIVE.has(w)) score += flip ? 1 : -1;
  });
  return score;
}

export function analyseReviews(reviews: ReviewInput[], now: Date = new Date()): ReviewSummary {
  const clean = reviews.filter((r) => Number.isFinite(r.rating) && r.rating >= 1 && r.rating <= 5);
  const distribution: ReviewSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  clean.forEach((r) => (distribution[Math.round(r.rating) as 1 | 2 | 3 | 4 | 5] += 1));
  const count = clean.length;
  const average = count ? round1(clean.reduce((s, r) => s + r.rating, 0) / count) : null;

  // Trend: the last 30 days against everything before; with all reviews recent, newer half against older half.
  const dated = clean.map((r) => ({ r, t: new Date(r.createdAt).getTime() })).sort((a, b) => a.t - b.t);
  let trend: ReviewSummary["trend"] = { direction: "not enough reviews", recentAverage: null, earlierAverage: null };
  if (count >= 4) {
    const cutoff = now.getTime() - 30 * 86_400_000;
    let recent = dated.filter((d) => d.t >= cutoff);
    let earlier = dated.filter((d) => d.t < cutoff);
    if (recent.length < 2 || earlier.length < 2) {
      const mid = Math.floor(dated.length / 2);
      earlier = dated.slice(0, mid);
      recent = dated.slice(mid);
    }
    const avg = (xs: typeof dated) => xs.reduce((s, d) => s + d.r.rating, 0) / xs.length;
    const ra = avg(recent);
    const ea = avg(earlier);
    trend = {
      direction: ra - ea >= 0.4 ? "improving" : ea - ra >= 0.4 ? "declining" : "steady",
      recentAverage: round1(ra),
      earlierAverage: round1(ea),
    };
  }

  // Themes: each sentence that mentions a theme counts for or against it.
  const tally = new Map<string, { positive: number; negative: number }>();
  for (const r of clean) {
    const sentences = text(r).split(/[.!?\n]+/).map((s) => words(s)).filter((w) => w.length);
    for (const ws of sentences) {
      const score = sentenceScore(ws);
      const sentiment = score > 0 ? 1 : score < 0 ? -1 : r.rating >= 4 ? 1 : r.rating <= 2 ? -1 : 0;
      if (sentiment === 0) continue;
      for (const [theme, keys] of Object.entries(THEMES)) {
        if (!ws.some((w) => keys.includes(w))) continue;
        const t = tally.get(theme) ?? { positive: 0, negative: 0 };
        if (sentiment > 0) t.positive += 1;
        else t.negative += 1;
        tally.set(theme, t);
      }
    }
  }
  const themes: Theme[] = [...tally.entries()].map(([theme, v]) => ({ theme, ...v }));
  const positiveThemes = themes.filter((t) => t.positive > t.negative).sort((a, b) => b.positive - a.positive).slice(0, 4);
  const negativeThemes = themes.filter((t) => t.negative >= t.positive && t.negative > 0).sort((a, b) => b.negative - a.negative).slice(0, 4);

  // Quotes: the best and the worst written reviews, then the newest.
  const withText = clean.filter((r) => (r.body ?? "").trim().length >= 10);
  const pickQuote = (r: ReviewInput) => ({
    rating: r.rating,
    text: text(r).slice(0, 220),
    author: r.author ?? "Customer",
  });
  const byLen = (a: ReviewInput, b: ReviewInput) => text(b).length - text(a).length;
  const quotes: ReviewSummary["quotes"] = [];
  const used = new Set<ReviewInput>();
  const add = (r?: ReviewInput) => {
    if (r && !used.has(r) && quotes.length < 4) {
      used.add(r);
      quotes.push(pickQuote(r));
    }
  };
  add([...withText].filter((r) => r.rating >= 4).sort(byLen)[0]);
  add([...withText].filter((r) => r.rating <= 2).sort(byLen)[0]);
  add([...withText].filter((r) => r.rating === 3).sort(byLen)[0]);
  add([...withText].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]);

  return { count, average, distribution, trend, positiveThemes, negativeThemes, quotes, few: count < 5 };
}

/** Plain-text evidence block for the AI. */
export function reviewEvidence(name: string, s: ReviewSummary): string {
  if (s.count === 0) return `REVIEW ANALYSIS for ${name}:\nThere are no reviews yet, so there is nothing to analyse.`;
  const d = s.distribution;
  const lines = [
    `REVIEW ANALYSIS for ${name} (all ${s.count} review${s.count === 1 ? "" : "s"} read):`,
    `Average rating ${s.average} out of 5. Five stars: ${d[5]}, four: ${d[4]}, three: ${d[3]}, two: ${d[2]}, one: ${d[1]}.`,
  ];
  if (s.few) lines.push(`There are only ${s.count} review${s.count === 1 ? "" : "s"}, so this is a small sample and should not be treated as strong proof.`);
  if (s.trend.direction !== "not enough reviews") {
    lines.push(`Trend: ${s.trend.direction} (recent average ${s.trend.recentAverage}, earlier average ${s.trend.earlierAverage}).`);
  }
  if (s.positiveThemes.length) lines.push(`Customers praise: ${s.positiveThemes.map((t) => `${t.theme} (${t.positive})`).join(", ")}.`);
  if (s.negativeThemes.length) lines.push(`Customers complain about: ${s.negativeThemes.map((t) => `${t.theme} (${t.negative})`).join(", ")}.`);
  if (!s.positiveThemes.length && !s.negativeThemes.length) lines.push("The written reviews do not repeat any clear theme.");
  s.quotes.forEach((q) => lines.push(`Quote (${q.rating} stars): "${q.text}"`));
  return lines.join("\n");
}
