import { COPY, type CopyId } from "@/features/copy/variants";

/** Choose a random index from 0 to length - 1. `random` is injected for tests. */
export function pickIndex(length: number, random: () => number = Math.random): number {
  if (!Number.isInteger(length) || length <= 1) return 0;
  const raw = random();
  const unit = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999999) : 0;
  return Math.floor(unit * length);
}

/** Return the variant for an id. Index 0 is used when `index` is omitted or out of range. */
export function variantAt(id: CopyId, index = 0): string {
  const list = COPY[id] as readonly string[];
  return list[index] ?? list[0];
}

/** Pick a random variant for an id. Never returns undefined. */
export function pickVariant(id: CopyId, random: () => number = Math.random): string {
  const list = COPY[id] as readonly string[];
  return list[pickIndex(list.length, random)] ?? list[0];
}
