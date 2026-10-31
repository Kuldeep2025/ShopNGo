/**
 * Listing media helpers – additive, read-only.
 * Returns a display image URL for a listing when one is available:
 * 1. media array entries ({ url, alt }) set by sellers
 * 2. attributes.image / attributes.imageUrl
 * 3. curated demo images bundled with the app (public/images/products)
 */

export type MediaItem = { url: string; alt?: string };

const DEMO_IMAGES: Record<string, string> = {
  "wireless-bluetooth-earbuds": "/images/products/earbuds.jpg",
  "complete-python-for-beginners": "/images/products/python-course.jpg",
  "exam-notes-class-12-physics": "/images/products/physics-notes.jpg",
  "cotton-bedsheet-set-king": "/images/products/bedsheet.jpg",
  "resume-review-service": "/images/products/resume-service.jpg",
  "art-of-simple-living-ebook": "/images/products/ebook.jpg",
};

function isSafeUrl(url: string): boolean {
  // Only http(s) or app-relative paths – never javascript: or data: URIs.
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}

export function getListingImageUrl(
  listing: { slug: string; media?: unknown; attributes?: unknown },
  /** When true, only returns images the app can guarantee (demo + relative). */
  localOnly = false
): string | null {
  const media = Array.isArray(listing.media)
    ? (listing.media as unknown[]).filter(
        (m): m is MediaItem =>
          !!m && typeof m === "object" && "url" in (m as object) &&
          typeof (m as MediaItem).url === "string" && isSafeUrl((m as MediaItem).url)
      )
    : [];

  if (media.length > 0 && !localOnly) return media[0]!.url;

  const attrs =
    listing.attributes && typeof listing.attributes === "object" && !Array.isArray(listing.attributes)
      ? (listing.attributes as Record<string, unknown>)
      : {};
  for (const key of ["image", "imageUrl", "img", "thumbnail"]) {
    const v = attrs[key];
    if (typeof v === "string" && isSafeUrl(v)) return v;
  }

  return DEMO_IMAGES[listing.slug] ?? null;
}

export function getListingImageAlt(listing: { title: string; media?: unknown }): string {
  const media = Array.isArray(listing.media)
    ? (listing.media as unknown[]).filter(
        (m): m is MediaItem => !!m && typeof m === "object" && "alt" in (m as object)
      )
    : [];
  return (media[0]?.alt as string | undefined) ?? listing.title;
}
