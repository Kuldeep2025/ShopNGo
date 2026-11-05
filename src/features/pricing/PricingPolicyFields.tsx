"use client";

import { useId } from "react";
import { Input, Textarea } from "@/components/ui";
import { RETURN_OPTIONS } from "@/features/policy/policy";
import { percentOff } from "./effectivePrice";
import { isoToIstLocal, istLocalToIso } from "./resolve";

export type PricingPolicyState = {
  mrp: string;
  saleEnabled: boolean;
  /** "price" = seller types the sale price; "percent" = seller types a percent. */
  saleMode: "price" | "percent";
  salePrice: string;
  salePercent: string;
  saleStart: string; // datetime-local in India time
  saleEnd: string;
  returnDays: string; // "" = not stated
  warrantyMonths: string; // "" = not stated, "0" = none
  guaranteeText: string;
  replacementPolicy: string;
};

export const emptyPricingPolicy = (): PricingPolicyState => ({
  mrp: "",
  saleEnabled: false,
  saleMode: "price",
  salePrice: "",
  salePercent: "",
  saleStart: "",
  saleEnd: "",
  returnDays: "",
  warrantyMonths: "",
  guaranteeText: "",
  replacementPolicy: "",
});

type Existing = {
  mrp?: string | null;
  saleEnabled?: boolean | null;
  salePrice?: string | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  returnDays?: number | null;
  warrantyMonths?: number | null;
  guaranteeText?: string | null;
  replacementPolicy?: string | null;
};

export function stateFromListing(l: Existing): PricingPolicyState {
  return {
    mrp: l.mrp ?? "",
    saleEnabled: Boolean(l.saleEnabled),
    saleMode: "price",
    salePrice: l.salePrice ?? "",
    salePercent: "",
    saleStart: isoToIstLocal(l.saleStartsAt),
    saleEnd: isoToIstLocal(l.saleEndsAt),
    returnDays: l.returnDays === null || l.returnDays === undefined ? "" : String(l.returnDays),
    warrantyMonths: l.warrantyMonths === null || l.warrantyMonths === undefined ? "" : String(l.warrantyMonths),
    guaranteeText: l.guaranteeText ?? "",
    replacementPolicy: l.replacementPolicy ?? "",
  };
}

/** The fields the server expects, built from the form. Dates typed in India time become exact instants. */
export function bodyFromState(s: PricingPolicyState): Record<string, unknown> {
  const body: Record<string, unknown> = {
    mrp: s.mrp.trim() === "" ? null : s.mrp,
    saleEnabled: s.saleEnabled,
    saleStartsAt: s.saleEnabled && s.saleStart ? istLocalToIso(s.saleStart) : null,
    saleEndsAt: s.saleEnabled && s.saleEnd ? istLocalToIso(s.saleEnd) : null,
    returnDays: s.returnDays === "" ? null : Number(s.returnDays),
    warrantyMonths: s.warrantyMonths === "" ? null : Number(s.warrantyMonths),
    guaranteeText: s.guaranteeText.trim() || null,
    replacementPolicy: s.replacementPolicy.trim() || null,
  };
  if (s.saleEnabled) {
    if (s.saleMode === "percent") {
      body.salePercent = Number(s.salePercent);
      body.salePrice = null;
    } else {
      body.salePrice = s.salePrice;
    }
  } else {
    body.salePrice = null;
  }
  return body;
}

const selectCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600";
const labelCls = "block text-sm font-medium text-gray-800";

/** Pricing tools (MRP, sale, discount, dates) and policy (returns, warranty, guarantee, replacement) for a listing. */
export function PricingPolicyFields({
  value,
  onChange,
  price,
}: {
  value: PricingPolicyState;
  onChange: (next: PricingPolicyState) => void;
  /** Regular selling price typed above, used to show the discount live. */
  price: string;
}) {
  const uid = useId();
  const set = <K extends keyof PricingPolicyState>(k: K, v: PricingPolicyState[K]) => onChange({ ...value, [k]: v });
  const p = Math.round(Number(price) * 100);
  const mrp = Math.round(Number(value.mrp) * 100);
  const base = mrp > 0 ? mrp : p;
  let sale = 0;
  if (value.saleEnabled) {
    sale = value.saleMode === "percent" ? Math.round((base * (100 - Number(value.salePercent))) / 100) : Math.round(Number(value.salePrice) * 100);
  }
  const shownSale = value.saleEnabled && sale > 0 ? sale : p;
  const pct = base > 0 && shownSale > 0 ? percentOff(base, shownSale) : 0;

  return (
    <div className="space-y-6">
      <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-900">Pricing</legend>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-mrp`} className={labelCls}>Print rate or MRP (INR, optional)</label>
          <Input id={`${uid}-mrp`} type="number" min="0" step="0.01" value={value.mrp} onChange={(e) => set("mrp", e.target.value)} aria-describedby={`${uid}-mrp-h`} />
          <p id={`${uid}-mrp-h`} className="text-xs text-gray-500">The selling price above cannot be higher than this.</p>
        </div>

        <div className="flex items-center gap-2">
          <input id={`${uid}-sale`} type="checkbox" checked={value.saleEnabled} onChange={(e) => set("saleEnabled", e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-teal-700 focus:ring-teal-600" />
          <label htmlFor={`${uid}-sale`} className="text-sm font-medium text-gray-800">This product is on sale</label>
        </div>

        {value.saleEnabled && (
          <div className="space-y-4">
            <fieldset>
              <legend className={labelCls}>How do you want to set the sale price?</legend>
              <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-800">
                <label className="flex items-center gap-2">
                  <input type="radio" name={`${uid}-mode`} checked={value.saleMode === "price"} onChange={() => set("saleMode", "price")} /> I enter the sale price
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name={`${uid}-mode`} checked={value.saleMode === "percent"} onChange={() => set("saleMode", "percent")} /> I enter the discount percent
                </label>
              </div>
            </fieldset>
            {value.saleMode === "price" ? (
              <div className="space-y-1.5">
                <label htmlFor={`${uid}-sp`} className={labelCls}>Sale price (INR)</label>
                <Input id={`${uid}-sp`} type="number" min="0" step="0.01" value={value.salePrice} onChange={(e) => set("salePrice", e.target.value)} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor={`${uid}-pc`} className={labelCls}>Discount percent (1 to 90)</label>
                <Input id={`${uid}-pc`} type="number" min="1" max="90" step="1" value={value.salePercent} onChange={(e) => set("salePercent", e.target.value)} />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor={`${uid}-st`} className={labelCls}>Sale starts (India time)</label>
                <Input id={`${uid}-st`} type="datetime-local" value={value.saleStart} onChange={(e) => set("saleStart", e.target.value)} aria-describedby={`${uid}-d-h`} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${uid}-en`} className={labelCls}>Sale ends (India time)</label>
                <Input id={`${uid}-en`} type="datetime-local" value={value.saleEnd} onChange={(e) => set("saleEnd", e.target.value)} aria-describedby={`${uid}-d-h`} />
              </div>
            </div>
            <p id={`${uid}-d-h`} className="text-xs text-gray-500">Leave a date empty for no start or no end. The sale switches on and off by itself at these times.</p>
          </div>
        )}
        <p className="text-sm text-gray-800" role="status" aria-live="polite">
          {pct > 0 ? `Customers will see ${pct}% off.` : "No discount is shown right now."}
          {value.saleEnabled && value.saleMode === "percent" && sale > 0 ? ` Sale price works out to ${(sale / 100).toFixed(2)} rupees.` : ""}
        </p>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-900">Returns, warranty and guarantee</legend>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-rd`} className={labelCls}>Return period</label>
          <select id={`${uid}-rd`} className={selectCls} value={value.returnDays} onChange={(e) => set("returnDays", e.target.value)}>
            <option value="">Not stated</option>
            {RETURN_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-wm`} className={labelCls}>Warranty in months (0 for none, optional)</label>
          <Input id={`${uid}-wm`} type="number" min="0" max="120" step="1" value={value.warrantyMonths} onChange={(e) => set("warrantyMonths", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-gt`} className={labelCls}>Guarantee (optional)</label>
          <Textarea id={`${uid}-gt`} rows={2} maxLength={500} value={value.guaranteeText} onChange={(e) => set("guaranteeText", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-rp`} className={labelCls}>Replacement policy (optional)</label>
          <Textarea id={`${uid}-rp`} rows={2} maxLength={500} value={value.replacementPolicy} onChange={(e) => set("replacementPolicy", e.target.value)} />
        </div>
      </fieldset>
    </div>
  );
}
