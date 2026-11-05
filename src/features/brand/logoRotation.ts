/** Number of logo designs available in the rotation. */
export const LOGO_COUNT = 6;
/** Time each logo stays visible, in milliseconds. */
export const LOGO_INTERVAL_MS = 2000;

/**
 * Pure helper: choose the next logo index at random, never the same as the
 * previous one. `random` is injected so tests are deterministic.
 */
export function nextLogoIndex(
  previous: number,
  count: number = LOGO_COUNT,
  random: () => number = Math.random,
): number {
  if (count <= 1) return 0;
  const safePrev = Number.isInteger(previous) && previous >= 0 && previous < count ? previous : -1;
  const raw = random();
  const unit = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999999) : 0;
  if (safePrev === -1) return Math.floor(unit * count);
  const pick = Math.floor(unit * (count - 1));
  return pick >= safePrev ? pick + 1 : pick;
}
