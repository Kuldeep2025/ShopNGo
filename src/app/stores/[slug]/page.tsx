import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui";
import {
  PRODUCT_TYPE_LABELS,
  filterPublicListings,
  toPublicListingDTO,
  toPublicStoreDTO,
  type PublicListingDTO,
  type PublicStoreDTO,
} from "@/features/catalogue";
import { DEMO_LISTINGS } from "@/lib/demo-data";
import { prisma, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function getStore(slug: string): Promise<{
  store: PublicStoreDTO;
  listings: PublicListingDTO[];
} | null> {
  const demo = () => {
    const listings = DEMO_LISTINGS.filter((listing) => listing.store.slug === slug);
    if (!listings.length) return null;
    const first = listings[0];
    return {
      store: { ...first.store, description: null, logoUrl: null },
      listings,
    };
  };
  if (!isDatabaseConfigured() || !prisma) return demo();
  try {
    const store = await prisma.store.findFirst({
      where: { slug, isActive: true },
      include: {
        listings: {
          where: { status: "APPROVED" },
          include: {
            store: { select: { id: true, name: true, slug: true, isActive: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!store) return demo();
    const storeDTO = toPublicStoreDTO(store);
    if (!storeDTO) return demo();
    const visible = filterPublicListings(store.listings);
    return { store: storeDTO, listings: visible.map(toPublicListingDTO) };
  } catch {
    return demo();
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getStore(slug);
  if (!data) return { title: "Store not found" };
  return {
    title: data.store.name,
    description: data.store.description?.slice(0, 160) ?? undefined,
  };
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const data = await getStore(slug);

  if (!data) {
    notFound();
  }

  const { store, listings } = data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <nav className="mb-6 text-sm text-gray-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-teal-700">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-800" aria-current="page">
            {store.name}
          </li>
        </ol>
      </nav>

      <header className="mb-10">
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-2xl"
            role="img"
            aria-label={`${store.name} logo`}
          >
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logoUrl}
                alt={`${store.name} logo`}
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              <span aria-hidden="true">🏪</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
            <Badge variant="success" className="mt-1">
              Active store
            </Badge>
            {store.description && (
              <p className="mt-2 text-sm text-gray-600">{store.description}</p>
            )}
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          Products ({listings.length})
        </h2>

        {listings.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            This store has no public products yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
            {listings.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/products/${l.slug}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
                >
                  <div>
                    <p className="font-medium text-gray-900">{l.title}</p>
                    <p className="text-sm text-gray-500">
                      {PRODUCT_TYPE_LABELS[l.productType] ?? l.productType}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-teal-800">
                    {l.currency} {l.price}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-center text-sm text-gray-500">
        <Link href="/categories" className="text-teal-700 hover:underline">
          ← Browse categories
        </Link>
      </p>
    </div>
  );
}
