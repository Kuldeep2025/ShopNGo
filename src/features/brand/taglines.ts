/**
 * ShopNGo rotating taglines & quotes (18 total).
 * A fresh one is picked on every load / refresh, per user (client-side only).
 * The order is never fixed: a day-seed shuffles the pool, then a fresh
 * random index picks the headline so repeats feel organic.
 */

export type Tagline = {
  text: string;
  /** "tagline" = brand headline, "quote" = short shopping quote */
  kind: "tagline" | "quote";
};

export const TAGLINES: Tagline[] = [
  { text: "Discover. Understand. Compare. Buy. Track.", kind: "tagline" },
  { text: "Everything you need, one marketplace away.", kind: "tagline" },
  { text: "Shop smart. Go further.", kind: "tagline" },
  { text: "Find it. Love it. Track it home.", kind: "tagline" },
  { text: "Your marketplace, your pace.", kind: "tagline" },
  { text: "From search to doorstep — all in ShopNGo.", kind: "tagline" },
  { text: "Compare freely. Buy confidently.", kind: "tagline" },
  { text: "Every product, one honest price tag.", kind: "tagline" },
  { text: "Big catalogue. Zero guesswork.", kind: "tagline" },
  { text: "Where shopping clicks.", kind: "tagline" },
  { text: "The best purchases start with clarity.", kind: "tagline" },
  { text: "Made for shoppers who compare first.", kind: "tagline" },
  { text: "Real stores. Real people. Real deals.", kind: "tagline" },
  { text: "Shopping that keeps its promises.", kind: "tagline" },
  { text: "One cart for every kind of product.", kind: "tagline" },
  { text: "\u201cThe quickest way to buy is knowing what you want.\u201d", kind: "quote" },
  { text: "\u201cHappiness is a package on its way.\u201d", kind: "quote" },
  { text: "\u201cGood finds never go out of style.\u201d", kind: "quote" },
];

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick a fresh tagline: day-seeded shuffle keeps the pool rotating daily,
 * then a random index makes every refresh different.
 */
export function pickTagline(now = new Date()): Tagline {
  const daySeed = Math.floor(now.getTime() / 86_400_000);
  let s = (daySeed * 2654435761) % 2147483647;
  if (s <= 0) s += 2147483646;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const pool = shuffle(TAGLINES, rand);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick ?? TAGLINES[0]!;
}

/** Render "quote" items in italic quotes, taglines as plain bold text. */
export function taglineClass(kind: Tagline["kind"]): string {
  return kind === "quote"
    ? "italic text-teal-300/90"
    : "font-bold text-teal-300";
}
