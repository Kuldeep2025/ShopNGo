import Link from "next/link";
import { ProductAdSlot } from "@/components/insights/ProductAdSlot";
import { Copy } from "@/features/copy/Copy";
import { toPublicCategoryDTO, type PublicCategoryDTO } from "@/features/catalogue";
import { DEMO_CATEGORIES } from "@/lib/demo-data";
import { prisma, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getCategories(): Promise<{
  categories: PublicCategoryDTO[];
  source: string;
}> {
  if (!isDatabaseConfigured() || !prisma) {
    return { categories: DEMO_CATEGORIES, source: "demo" };
  }
  try {
    const roots = await prisma.category.findMany({
      where: { parentId: null },
      include: { children: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
    return roots.length
      ? { categories: roots.map(toPublicCategoryDTO), source: "database" }
      : { categories: DEMO_CATEGORIES, source: "demo-fallback" };
  } catch {
    return { categories: DEMO_CATEGORIES, source: "demo-fallback" };
  }
}

export const metadata = {
  title: "Categories",
};

export default async function CategoriesPage() {
  const { categories } = await getCategories();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Categories
        </h1>
        <p className="mt-2 text-gray-600">
          <Copy id="categories.intro" />
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <p className="text-lg font-medium text-gray-900">
            Categories will appear here soon
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Use search to find products in the meantime.
          </p>
          <Link
            href="/search"
            className="mt-6 inline-block text-sm font-medium text-teal-700 hover:underline"
          >
            Go to search
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li key={cat.id}>
              <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-teal-200 hover:shadow-md">
                <Link
                  href={`/search?category=${encodeURIComponent(cat.slug)}`}
                  className="text-lg font-semibold text-gray-900 hover:text-teal-800"
                >
                  {cat.name}
                </Link>
                {cat.children && cat.children.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {cat.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/search?category=${encodeURIComponent(child.slug)}`}
                          className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 transition hover:bg-teal-50 hover:text-teal-800"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ProductAdSlot placement="categories-bottom" className="mt-8 !px-0 sm:!px-0" />
    </div>
  );
}
