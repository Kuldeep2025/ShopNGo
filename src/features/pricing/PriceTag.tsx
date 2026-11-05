import { formatIst } from "./effectivePrice";

export type PriceTagData = {
  price: string;
  currency?: string;
  strikePrice?: string | null;
  percentOff?: number;
  saleEndsAt?: string | null;
};

const symbol = (c?: string) => (!c || c === "INR" ? "₹" : `${c} `);
const money = (v: string, c?: string) => `${symbol(c)}${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Price with the sale shown clearly: strikethrough MRP, sale price, "xx% off" and when the sale ends.
 * Screen readers hear "Original price ... Now ..." instead of two bare numbers.
 */
export function PriceTag({ price, currency, strikePrice, percentOff = 0, saleEndsAt, size = "md", showEnd = true, className = "" }: PriceTagData & { size?: "sm" | "md" | "lg"; showEnd?: boolean; className?: string }) {
  const big = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-lg";
  const discounted = Boolean(strikePrice) && percentOff > 0;
  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className={`${big} font-semibold text-teal-800 dark:text-teal-300`}>
          {discounted && <span className="sr-only">Now </span>}
          {money(price, currency)}
        </span>
        {discounted && (
          <>
            <s className="text-sm text-gray-500 dark:text-zinc-400">
              <span className="sr-only">Original price </span>
              {money(strikePrice as string, currency)}
            </s>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{percentOff}% off</span>
          </>
        )}
      </p>
      {discounted && showEnd && saleEndsAt && <p className="text-xs text-gray-600 dark:text-zinc-400">Sale ends {formatIst(saleEndsAt)}</p>}
    </div>
  );
}
