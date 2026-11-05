import { ProductAdSlot } from "@/components/insights/ProductAdSlot";
import { PickedForYou } from "@/components/insights/PickedForYou";
import { CinematicHome } from "@/features/cinematic/CinematicHome";
import { filterPublicListings, toPublicListingDTO, type PublicListingDTO } from "@/features/catalogue";
import { DEMO_LISTINGS } from "@/lib/demo-data";
import { prisma, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getListings(): Promise<PublicListingDTO[]> {
  if (!isDatabaseConfigured() || !prisma) return DEMO_LISTINGS;
  try {
    const listings = await prisma.listing.findMany({
      where: { status: "APPROVED", store: { isActive: true } },
      include: {
        store: { select: { id: true, name: true, slug: true, isActive: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
    const visible = filterPublicListings(listings);
    return visible.length ? visible.map(toPublicListingDTO) : DEMO_LISTINGS;
  } catch {
    return DEMO_LISTINGS;
  }
}

export default async function HomePage() {
  const listings = await getListings();
  return (
    <>
      <CinematicHome listings={listings} />
      <ProductAdSlot placement="home-between-sections" />
      <PickedForYou />
      <ProductAdSlot placement="home-lower" offset={5} />
    </>
  );
}
