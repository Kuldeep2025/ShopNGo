import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isPubliclyVisible, toPublicListingDTO } from "@/features/catalogue";
import { getDemoListingBySlug } from "@/lib/demo-data";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, context: Ctx) {
  const { slug } = await context.params;

  if (!isDatabaseConfigured() || !prisma) {
    const demo = getDemoListingBySlug(slug);
    if (!demo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      listing: demo,
      store: {
        id: demo.store.id,
        name: demo.store.name,
        slug: demo.store.slug,
        description: null,
        logoUrl: null,
      },
      source: "demo",
    });
  }

  try {
    const listing = await prisma.listing.findFirst({
      where: { slug },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            description: true,
            logoUrl: true,
          },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!listing || !isPubliclyVisible(listing)) {
      // Fall back to demo for known demo slugs so links still work in mixed mode
      const demo = getDemoListingBySlug(slug);
      if (demo) {
        return NextResponse.json({
          listing: demo,
          store: {
            id: demo.store.id,
            name: demo.store.name,
            slug: demo.store.slug,
            description: null,
            logoUrl: null,
          },
          source: "demo-fallback",
        });
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      listing: toPublicListingDTO(listing),
      store: {
        id: listing.store.id,
        name: listing.store.name,
        slug: listing.store.slug,
        description: listing.store.description,
        logoUrl: listing.store.logoUrl,
      },
      source: "database",
    });
  } catch {
    const demo = getDemoListingBySlug(slug);
    if (demo) {
      return NextResponse.json({
        listing: demo,
        store: {
          id: demo.store.id,
          name: demo.store.name,
          slug: demo.store.slug,
          description: null,
          logoUrl: null,
        },
        source: "demo-fallback",
      });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
