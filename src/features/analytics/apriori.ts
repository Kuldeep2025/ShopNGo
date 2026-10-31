/**
 * Market basket analysis with the Apriori algorithm.
 *
 * - support(X)        = baskets containing X / all baskets
 * - confidence(X ⇒ Y) = support(X ∪ Y) / support(X)
 * - lift(X ⇒ Y)       = confidence(X ⇒ Y) / support(Y)
 *
 * Lift > 1 means the items are bought together more often than chance.
 */

export type Itemset = { items: string[]; support: number; count: number };

export type AssociationRule = {
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
  count: number;
};

export type AprioriOptions = {
  minSupport?: number; // fraction of baskets, default 0.02
  minConfidence?: number; // default 0.2
  maxItemsetSize?: number; // default 3
};

const keyOf = (items: string[]) => items.join("\u0000");

/** Mine frequent itemsets level by level, pruning with the Apriori property. */
export function frequentItemsets(
  baskets: string[][],
  minSupport = 0.02,
  maxItemsetSize = 3
): Itemset[] {
  const n = baskets.length;
  if (n === 0) return [];
  const minCount = Math.max(1, Math.ceil(minSupport * n));
  const sets = baskets.map((b) => new Set(b));

  // L1
  const counts = new Map<string, number>();
  for (const s of sets) for (const item of s) counts.set(item, (counts.get(item) ?? 0) + 1);
  let current: string[][] = [...counts.entries()]
    .filter(([, c]) => c >= minCount)
    .map(([item]) => [item])
    .sort((a, b) => a[0].localeCompare(b[0]));

  const result: Itemset[] = current.map((items) => {
    const count = counts.get(items[0])!;
    return { items, count, support: count / n };
  });

  for (let k = 2; k <= maxItemsetSize && current.length > 1; k++) {
    const prevKeys = new Set(current.map(keyOf));
    const candidates: string[][] = [];
    // Join step: combine (k-1)-itemsets sharing their first k-2 items.
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i];
        const b = current[j];
        if (keyOf(a.slice(0, k - 2)) !== keyOf(b.slice(0, k - 2))) continue;
        const cand = [...a, b[k - 2]].sort((x, y) => x.localeCompare(y));
        // Prune step: every (k-1)-subset must be frequent.
        const allSubsetsFrequent = cand.every((_, idx) =>
          prevKeys.has(keyOf(cand.filter((__, m) => m !== idx)))
        );
        if (allSubsetsFrequent) candidates.push(cand);
      }
    }

    const next: string[][] = [];
    for (const cand of candidates) {
      let count = 0;
      for (const s of sets) if (cand.every((it) => s.has(it))) count++;
      if (count >= minCount) {
        next.push(cand);
        result.push({ items: cand, count, support: count / n });
      }
    }
    current = next;
  }
  return result;
}

/** All non-empty proper subsets of an itemset. */
function properSubsets(items: string[]): string[][] {
  const out: string[][] = [];
  const total = 1 << items.length;
  for (let mask = 1; mask < total - 1; mask++) {
    out.push(items.filter((_, i) => mask & (1 << i)));
  }
  return out;
}

/** Generate association rules from the frequent itemsets, sorted by lift then confidence. */
export function associationRules(
  baskets: string[][],
  options: AprioriOptions = {}
): AssociationRule[] {
  const { minSupport = 0.02, minConfidence = 0.2, maxItemsetSize = 3 } = options;
  const itemsets = frequentItemsets(baskets, minSupport, maxItemsetSize);
  const supportByKey = new Map(itemsets.map((s) => [keyOf(s.items), s.support]));
  const rules: AssociationRule[] = [];

  for (const set of itemsets) {
    if (set.items.length < 2) continue;
    for (const antecedent of properSubsets(set.items)) {
      const consequent = set.items.filter((i) => !antecedent.includes(i));
      const supA = supportByKey.get(keyOf(antecedent));
      const supC = supportByKey.get(keyOf(consequent));
      if (!supA || !supC) continue;
      const confidence = set.support / supA;
      if (confidence < minConfidence) continue;
      rules.push({
        antecedent,
        consequent,
        support: round(set.support),
        confidence: round(confidence),
        lift: round(confidence / supC),
        count: set.count,
      });
    }
  }
  return rules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);
}

/**
 * "Frequently bought together" for one product: single-item rules
 * {listingId} ⇒ {other} with lift above 1.
 */
export function frequentlyBoughtTogether(
  baskets: string[][],
  listingId: string,
  limit = 4,
  options: AprioriOptions = {}
): AssociationRule[] {
  return associationRules(baskets, { ...options, maxItemsetSize: 2 })
    .filter(
      (r) =>
        r.antecedent.length === 1 &&
        r.antecedent[0] === listingId &&
        r.lift > 1
    )
    .slice(0, limit);
}

export function round(value: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
