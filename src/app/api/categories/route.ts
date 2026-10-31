import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { toPublicCategoryDTO } from "@/features/catalogue";
import { DEMO_CATEGORIES } from "@/lib/demo-data";

/**
 * GET /api/categories
 * Real DB when configured; demo catalogue otherwise (preview only).
 */
export async function GET() {
  if (!isDatabaseConfigured() || !prisma) {
    return NextResponse.json({
      categories: DEMO_CATEGORIES,
      source: "demo",
    });
  }

  try {
    const roots = await prisma.category.findMany({
      where: { parentId: null },
      include: { children: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });

    if (roots.length === 0) {
      return NextResponse.json({
        categories: DEMO_CATEGORIES,
        source: "demo-fallback",
      });
    }

    return NextResponse.json({
      categories: roots.map(toPublicCategoryDTO),
      source: "database",
    });
  } catch {
    return NextResponse.json({
      categories: DEMO_CATEGORIES,
      source: "demo-fallback",
    });
  }
}
