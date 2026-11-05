/**
 * Validates and normalises the pricing a seller types in.
 * Rules: sale price <= MRP, discount between 1 and 90 percent, sale end after sale start.
 */
import { percentOff } from "./effectivePrice";

export type PricingInput = {
  /** Regular selling price. */
  price: string | number;
  mrp?: string | number | null;
  saleEnabled?: boolean | null;
  salePrice?: string | number | null;
  /** Seller may give a percent instead of a sale price; the price is then worked out. */
  salePercent?: number | null;
  saleStartsAt?: string | Date | null;
  saleEndsAt?: string | Date | null;
};

export type PricingResult =
  | {
      ok: true;
      data: {
        mrp: string | null;
        saleEnabled: boolean;
        salePrice: string | null;
        saleStartsAt: Date | null;
        saleEndsAt: Date | null;
        /** Discount percent shown to the seller (sale vs MRP, else sale vs price, else MRP vs price). */
        percent: number;
      };
    }
  | { ok: false; error: string };

const cents = (v: string | number) => Math.round(Number(v) * 100);
const isBlank = (v: unknown) => v === null || v === undefined || v === "";

function parseDate(v: string | Date | null | undefined): Date | null | "bad" {
  if (isBlank(v)) return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return Number.isNaN(d.getTime()) ? "bad" : d;
}

export function resolvePricing(input: PricingInput): PricingResult {
  if (isBlank(input.price) || !Number.isFinite(Number(input.price)) || Number(input.price) < 0) {
    return { ok: false, error: "Selling price must be a number, zero or more." };
  }
  const price = cents(input.price);

  let mrp: number | null = null;
  if (!isBlank(input.mrp)) {
    if (!Number.isFinite(Number(input.mrp)) || Number(input.mrp) <= 0) return { ok: false, error: "Print rate (MRP) must be more than zero." };
    mrp = cents(input.mrp as string | number);
    if (price > mrp) return { ok: false, error: "Selling price cannot be higher than the print rate (MRP)." };
  }

  const enabled = Boolean(input.saleEnabled);
  if (!enabled) {
    return {
      ok: true,
      data: {
        mrp: mrp === null ? null : (mrp / 100).toFixed(2),
        saleEnabled: false,
        salePrice: null,
        saleStartsAt: null,
        saleEndsAt: null,
        percent: mrp ? percentOff(mrp, price) : 0,
      },
    };
  }

  const base = mrp ?? price;
  let sale: number;
  if (!isBlank(input.salePrice)) {
    if (!Number.isFinite(Number(input.salePrice)) || Number(input.salePrice) <= 0) return { ok: false, error: "Sale price must be more than zero." };
    sale = cents(input.salePrice as string | number);
  } else if (!isBlank(input.salePercent)) {
    const p = Number(input.salePercent);
    if (!Number.isInteger(p) || p < 1 || p > 90) return { ok: false, error: "Discount percent must be a whole number from 1 to 90." };
    sale = Math.round((base * (100 - p)) / 100);
  } else {
    return { ok: false, error: "Enter a sale price or a discount percent for the sale." };
  }

  if (mrp !== null && sale > mrp) return { ok: false, error: "Sale price cannot be higher than the print rate (MRP)." };
  if (sale >= price) return { ok: false, error: "Sale price must be lower than the regular selling price." };
  const pct = percentOff(base, sale);
  if (pct < 1 || pct > 90) return { ok: false, error: "The discount must be between 1 and 90 percent." };

  const start = parseDate(input.saleStartsAt);
  const end = parseDate(input.saleEndsAt);
  if (start === "bad" || end === "bad") return { ok: false, error: "The sale start or end date is not valid." };
  if (start && end && end.getTime() <= start.getTime()) return { ok: false, error: "The sale must end after it starts." };

  return {
    ok: true,
    data: {
      mrp: mrp === null ? null : (mrp / 100).toFixed(2),
      saleEnabled: true,
      salePrice: (sale / 100).toFixed(2),
      saleStartsAt: start,
      saleEndsAt: end,
      percent: pct,
    },
  };
}

/** A datetime-local value typed in Indian time ("2026-11-10T18:30") to an ISO instant. */
export function istLocalToIso(v: string): string | null {
  if (!v) return null;
  const withSeconds = v.length === 16 ? `${v}:00` : v;
  const d = new Date(`${withSeconds}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** An ISO instant back to a datetime-local value in Indian time. */
export function isoToIstLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600_000);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
}
