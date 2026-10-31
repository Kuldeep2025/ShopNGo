import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import { isPubliclyVisible, toPublicListingDTO, PRODUCT_TYPE_LABELS, type PublicListingDTO } from "@/features/catalogue";
import { getDemoListingBySlug } from "@/lib/demo-data";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { pickArtworkVariant } from "@/features/cinematic/layoutEngine";
import { getListingImageUrl, getListingImageAlt } from "@/features/catalogue/media";
import { FrequentlyBoughtTogether } from "@/components/insights/FrequentlyBoughtTogether";

type Props = { params: Promise<{ slug: string }> };

async function getProduct(slug: string): Promise<{
  listing: PublicListingDTO;
  store: { id: string; name: string; slug: string; description: string | null };
} | null> {
  if (!isDatabaseConfigured() || !prisma) {
    const demo = getDemoListingBySlug(slug);
    return demo ? {
      listing: demo,
      store: { ...demo.store, description: null },
    } : null;
  }
  try {
    const listing = await prisma.listing.findFirst({
      where: { slug },
      include: {
        store: { select: { id: true, name: true, slug: true, isActive: true, description: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (listing && isPubliclyVisible(listing)) {
      return {
        listing: toPublicListingDTO(listing),
        store: {
          id: listing.store.id,
          name: listing.store.name,
          slug: listing.store.slug,
          description: listing.store.description,
        },
      };
    }
    const demo = getDemoListingBySlug(slug);
    return demo ? { listing: demo, store: { ...demo.store, description: null } } : null;
  } catch {
    const demo = getDemoListingBySlug(slug);
    return demo ? { listing: demo, store: { ...demo.store, description: null } } : null;
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) return { title: "Product not found" };
  return {
    title: data.listing.title,
    description: data.listing.description?.slice(0, 160) ?? undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const data = await getProduct(slug);

  if (!data) {
    notFound();
  }

  const { listing, store } = data;
  const typeLabel =
    PRODUCT_TYPE_LABELS[listing.productType] ?? listing.productType;
  const priceLabel =
    listing.currency === "INR" ? `₹ ${listing.price}` : `${listing.currency} ${listing.price}`;
  const artwork = pickArtworkVariant(listing, "general");
  const imageUrl = getListingImageUrl(listing, true);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-8 text-sm text-gray-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="transition hover:text-teal-700">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/search" className="transition hover:text-teal-700">
              Search
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-[200px] truncate text-gray-800" aria-current="page">
            {listing.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div
          className={`flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br ${artwork.gradient} text-7xl text-white shadow-inner`}
          role="img"
          aria-label={getListingImageAlt(listing)}
        >
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={getListingImageAlt(listing)}
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            artwork.emoji
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="brand">{typeLabel}</Badge>
            {listing.category && (
              <Badge variant="default">{listing.category.name}</Badge>
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
            {listing.title}
          </h1>
          <p className="mt-4 text-3xl font-semibold text-teal-800">{priceLabel}</p>

          {listing.description && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                About this product
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-gray-700">
                {listing.description}
              </p>
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-medium text-gray-500">Sold by</p>
            <Link
              href={`/stores/${store.slug}`}
              className="mt-1 inline-block text-lg font-semibold text-teal-800 hover:underline"
            >
              {store.name}
            </Link>
            {store.description && (
              <p className="mt-1 text-sm text-gray-600">{store.description}</p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" disabled title="Sign in and add from cart when available">
              Add to cart
            </Button>
            <Link href={`/stores/${store.slug}`}>
              <Button size="lg" variant="outline">
                View store
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Sign in to add items to your cart and checkout.
          </p>
        </div>
      </div>

      <FrequentlyBoughtTogether slug={listing.slug} />
    </div>
  );
}
