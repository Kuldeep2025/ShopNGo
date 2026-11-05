/**
 * Effective (what the customer pays) price, worked out at read time from the sale dates.
 * No cron job is needed: a sale is simply "on" while now is inside its window.
 * All server code that charges money must use this, never a price sent by the browser.
 */

export type PricingFields = {
  /** Regular selling price. */
  price: { toString(): string } | string | number;
  /** Print rate / maximum retail price. */
  mrp?: { toString(): string } | string | number | null;
  saleEnabled?: boolean | null;
  salePrice?: { toString(): string } | string | number | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
};

export type EffectivePrice = {
  /** The amount to charge for one unit, as "1234.00". */
  unitPrice: string;
  /** Regular selling price, "1234.00". */
  regularPrice: string;
  /** Print rate (MRP) as "1234.00" or null. */
  mrp: string | null;
  /** True only while a sale is running right now. */
  onSale: boolean;
  /** True when a sale is set up but has not started yet. */
  saleUpcoming: boolean;
  /** Percent off compared with the MRP (or the regular price when no MRP). 0 when there is no discount. */
  percentOff: number;
  /** The price shown struck through, or null. */
  strikePrice: string | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
};

const toCents = (v: { toString(): string } | string | number): number => Math.round(Number(v.toString()) * 100);
const fmt = (cents: number): string => (cents / 100).toFixed(2);

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole-number percent off `base`, for a price of `now` (never negative, capped at 99). */
export function percentOff(baseCents: number, nowCents: number): number {
  if (!(baseCents > 0) || nowCents >= baseCents) return 0;
  return Math.min(99, Math.round(((baseCents - nowCents) / baseCents) * 100));
}

export function computeEffectivePrice(f: PricingFields, now: Date = new Date()): EffectivePrice {
  const regular = toCents(f.price);
  const mrpCents = f.mrp !== null && f.mrp !== undefined && toCents(f.mrp) > 0 ? toCents(f.mrp) : null;
  const start = toDate(f.saleStartsAt);
  const end = toDate(f.saleEndsAt);
  const saleCents = f.salePrice !== null && f.salePrice !== undefined ? toCents(f.salePrice) : null;
  const configured = Boolean(f.saleEnabled) && saleCents !== null && saleCents >= 0 && saleCents < regular;

  const started = !start || start.getTime() <= now.getTime();
  const notEnded = !end || now.getTime() < end.getTime();
  const onSale = configured && started && notEnded;
  const saleUpcoming = configured && !started && notEnded;

  const unit = onSale ? (saleCents as number) : regular;
  const base = mrpCents && mrpCents > regular ? mrpCents : regular;
  const pct = percentOff(base, unit);
  const strike = unit < base ? base : null;

  return {
    unitPrice: fmt(unit),
    regularPrice: fmt(regular),
    mrp: mrpCents ? fmt(mrpCents) : null,
    onSale,
    saleUpcoming,
    percentOff: pct,
    strikePrice: strike ? fmt(strike) : null,
    saleStartsAt: configured && start ? start.toISOString() : null,
    saleEndsAt: onSale && end ? end.toISOString() : null,
  };
}

/** Plain-words date for badges, always in Indian time. */
export function formatIst(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " IST";
}
