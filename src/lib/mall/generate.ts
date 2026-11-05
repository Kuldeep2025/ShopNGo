/**
 * Builds the ShopNGo Mall catalogue: 2,230 products with unique names, brand,
 * price, stock, a three-sentence description and a local image path.
 * Pure and deterministic, so the seed and the image generator always agree.
 */
import { createRng } from "../../features/analytics/random";
import { MALL_PARENTS, MALL_SUBCATEGORIES, SERIES, type SubSpec } from "./specs";

export type MallProduct = {
  id: string;
  sku: string;
  title: string;
  slug: string;
  description: string;
  brand: string;
  series: string;
  variant: string;
  price: string;
  stock: number;
  storeId: string;
  storeKey: string;
  categoryId: string;
  categoryName: string;
  parentName: string;
  icon: string;
  imagePath: string;
  imageAlt: string;
  createdAt: Date;
};

export const MALL_IMAGE_DIR = "/images/mall";
const CATALOGUE_END = new Date("2026-11-01T09:00:00Z");

export const mallStoreId = (key: string) => `mall-store-${key}`;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function makePrice(rng: () => number, [lo, hi]: [number, number]): string {
  const raw = lo + (hi - lo) * Math.pow(rng(), 1.7);
  let value: number;
  if (raw < 100) value = Math.max(Math.round(raw / 5) * 5 - 1, lo);
  else if (raw < 1000) value = Math.round(raw / 10) * 10 - 1;
  else value = Math.round(raw / 100) * 100 - 1;
  return `${Math.max(value, 19)}.00`;
}

function describe(rng: () => number, spec: SubSpec, p: { brand: string; series: string; noun: string; variant: string }): string {
  const feature = pick(rng, spec.features);
  const use = pick(rng, spec.uses);
  const name = `${p.brand} ${p.series} ${p.noun}`;
  const s1 = pick(rng, [`The ${name} ${feature}.`, `${name}: it ${feature}.`, `Meet the ${name}, which ${feature}.`]);
  const s2 = pick(rng, [`A dependable pick for ${use}.`, `It works well for ${use}.`, `Chosen by shoppers for ${use}.`]);
  const s3 = pick(rng, [
    `This listing is the ${p.variant} option.`,
    `You are viewing the ${p.variant} version.`,
    `Choose this listing for the ${p.variant} option.`,
  ]);
  return `${s1} ${s2} ${s3}`;
}

export function generateMallCatalogue(): MallProduct[] {
  const rng = createRng(20261101);
  const storesByParent = new Map(MALL_PARENTS.map((p) => [p.id, p]));
  const names = new Set<string>();
  const out: MallProduct[] = [];
  let n = 0;

  for (const spec of MALL_SUBCATEGORIES) {
    const parent = storesByParent.get(spec.parent)!;
    for (let i = 0; i < spec.quota; i++) {
      let title = "";
      let pick1: { brand: string; series: string; noun: string; variant: string; store: (typeof parent.stores)[number] } | null = null;
      for (let attempt = 0; attempt < 200 && !pick1; attempt++) {
        const store = pick(rng, parent.stores);
        const cand = {
          store,
          brand: pick(rng, store.brands),
          series: pick(rng, SERIES),
          noun: spec.nouns[(i + attempt) % spec.nouns.length]!,
          variant: pick(rng, spec.variants),
        };
        const t = `${cand.brand} ${cand.series} ${cand.noun} - ${cand.variant}`;
        if (!names.has(t.toLowerCase())) {
          names.add(t.toLowerCase());
          title = t;
          pick1 = cand;
        }
      }
      if (!pick1) throw new Error(`Could not build a unique product name for ${spec.name}`);

      n += 1;
      const seq = String(n).padStart(4, "0");
      const slug = slugify(title);
      const ageDays = Math.floor(rng() * 150);
      const stockRoll = rng();
      const stock =
        stockRoll < 0.01
          ? 0
          : stockRoll < 0.06
            ? 1 + Math.floor(rng() * 5)
            : spec.stock[0] + Math.floor(rng() * (spec.stock[1] - spec.stock[0] + 1));

      out.push({
        id: `mall-${seq}`,
        sku: `MALL-${seq}`,
        title,
        slug,
        description: describe(rng, spec, pick1),
        brand: pick1.brand,
        series: pick1.series,
        variant: pick1.variant,
        price: makePrice(rng, spec.price),
        stock,
        storeId: mallStoreId(pick1.store.key),
        storeKey: pick1.store.key,
        categoryId: spec.id,
        categoryName: spec.name,
        parentName: parent.name,
        icon: spec.icon,
        imagePath: `${MALL_IMAGE_DIR}/${slug}.svg`,
        imageAlt: `Illustration of ${pick1.brand} ${pick1.series} ${pick1.noun}, ${pick1.variant}, in the ${spec.name} category`,
        createdAt: new Date(CATALOGUE_END.getTime() - ageDays * 86_400_000 - Math.floor(rng() * 86_400_000)),
      });
    }
  }
  return out;
}
