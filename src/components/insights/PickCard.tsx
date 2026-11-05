"use client";

import Link from "next/link";
import { getListingImageUrl, getListingImageAlt } from "@/features/catalogue/media";
import type { PublicListingDTO } from "@/features/catalogue";

export type Rec = PublicListingDTO & { reason?: string; kind?: string; liked?: boolean };

type Props = {
  rec: Rec;
  onDismiss: (rec: Rec) => void;
  onToggleLike: (rec: Rec) => void;
  className?: string;
};

/** One recommended product with its reason, a "Not interested" button and a Save button. */
export function PickCard({ rec: l, onDismiss, onToggleLike, className = "" }: Props) {
  const img = getListingImageUrl(l);
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-300 focus-within:border-teal-500 hover:border-teal-400 hover:shadow-lg motion-reduce:transition-none dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <Link
        href={`/products/${l.slug}`}
        className="group block flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={getListingImageAlt(l)}
            loading="lazy"
            className="aspect-square w-full bg-gray-50 object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="aspect-square w-full bg-teal-50 dark:bg-zinc-800" aria-hidden="true" />
        )}
        <div className="p-3">
          <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-zinc-100">{l.title}</p>
          <p className="mt-1 text-sm font-semibold text-teal-800 dark:text-teal-300">
            {l.currency === "INR" ? `₹ ${l.price}` : `${l.currency} ${l.price}`}
          </p>
          {l.reason && (
            <p className="mt-2 inline-block rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-900 dark:bg-teal-950 dark:text-teal-200">
              {l.reason}
            </p>
          )}
        </div>
      </Link>
      <div className="flex gap-2 border-t border-gray-100 p-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => onDismiss(l)}
          aria-label={`Not interested in ${l.title}`}
          className="flex-1 rounded-lg px-2 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Not interested
        </button>
        <button
          type="button"
          onClick={() => onToggleLike(l)}
          aria-pressed={Boolean(l.liked)}
          aria-label={l.liked ? `Remove ${l.title} from saved` : `Save ${l.title}`}
          className="flex-1 rounded-lg px-2 py-2 text-xs font-medium text-teal-800 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-300 dark:hover:bg-zinc-800"
        >
          {l.liked ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
