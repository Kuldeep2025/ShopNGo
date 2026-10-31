/**
 * Demo catalogue used when the database is not connected.
 * Lets visitors explore the full UI without Firebase or Neon.
 */

import type { PublicListingDTO, PublicCategoryDTO } from "@/features/catalogue";

export const DEMO_CATEGORIES: PublicCategoryDTO[] = [
  {
    id: "cat-electronics",
    name: "Electronics",
    slug: "electronics",
    parentId: null,
    children: [
      { id: "cat-phones", name: "Phones", slug: "phones", parentId: "cat-electronics" },
      { id: "cat-laptops", name: "Laptops", slug: "laptops", parentId: "cat-electronics" },
    ],
  },
  {
    id: "cat-books",
    name: "Books & Notes",
    slug: "books-notes",
    parentId: null,
    children: [
      { id: "cat-ebooks", name: "E-books", slug: "ebooks", parentId: "cat-books" },
      { id: "cat-enotes", name: "E-notes", slug: "e-notes", parentId: "cat-books" },
    ],
  },
  {
    id: "cat-courses",
    name: "Courses",
    slug: "courses",
    parentId: null,
    children: [],
  },
  {
    id: "cat-home",
    name: "Home & Living",
    slug: "home-living",
    parentId: null,
    children: [],
  },
  {
    id: "cat-services",
    name: "Services",
    slug: "services",
    parentId: null,
    children: [],
  },
];

export const DEMO_LISTINGS: PublicListingDTO[] = [
  {
    id: "demo-1",
    title: "Wireless Bluetooth Earbuds",
    slug: "wireless-bluetooth-earbuds",
    description:
      "Comfortable fit, clear sound, and long battery life. Ideal for calls and daily commute. Includes charging case.",
    productType: "PHYSICAL",
    price: "1499.00",
    currency: "INR",
    store: { id: "store-1", name: "SoundWave Store", slug: "soundwave-store" },
    category: { id: "cat-electronics", name: "Electronics", slug: "electronics" },
    media: [
      { url: "/images/products/earbuds.jpg", alt: "Wireless Bluetooth earbuds with charging case" },
    ],
    attributes: { color: "Black", warranty: "1 year" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "Complete Python for Beginners",
    slug: "complete-python-for-beginners",
    description:
      "Step-by-step course covering basics to small projects. Lifetime access after purchase. Suitable for students and career switchers.",
    productType: "COURSE",
    price: "999.00",
    currency: "INR",
    store: { id: "store-2", name: "LearnHub Academy", slug: "learnhub-academy" },
    category: { id: "cat-courses", name: "Courses", slug: "courses" },
    media: [
      { url: "/images/products/python-course.jpg", alt: "Python programming course cover" },
    ],
    attributes: { level: "Beginner", duration: "12 hours" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    title: "Exam Notes: Class 12 Physics",
    slug: "exam-notes-class-12-physics",
    description:
      "Concise chapter notes with formulas and practice questions. Instant digital access after payment.",
    productType: "E_NOTE",
    price: "199.00",
    currency: "INR",
    store: { id: "store-3", name: "StudyPoint", slug: "studypoint" },
    category: { id: "cat-enotes", name: "E-notes", slug: "e-notes" },
    media: [
      { url: "/images/products/physics-notes.jpg", alt: "Class 12 physics notes with formulas" },
    ],
    attributes: { format: "PDF", pages: "120" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-4",
    title: "Cotton Bedsheet Set (King)",
    slug: "cotton-bedsheet-set-king",
    description:
      "Soft cotton, colour-fast print, includes two pillow covers. Easy wash and everyday comfort.",
    productType: "PHYSICAL",
    price: "1299.00",
    currency: "INR",
    store: { id: "store-4", name: "HomeComfort", slug: "homecomfort" },
    category: { id: "cat-home", name: "Home & Living", slug: "home-living" },
    media: [
      { url: "/images/products/bedsheet.jpg", alt: "Cotton king-size bedsheet set" },
    ],
    attributes: { size: "King", material: "Cotton" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-5",
    title: "Resume Review Service",
    slug: "resume-review-service",
    description:
      "Professional review of your resume with written feedback within 48 hours. One revision included.",
    productType: "SERVICE",
    price: "499.00",
    currency: "INR",
    store: { id: "store-5", name: "CareerCraft", slug: "careercraft" },
    category: { id: "cat-services", name: "Services", slug: "services" },
    media: [
      { url: "/images/products/resume-service.jpg", alt: "Professional resume document" },
    ],
    attributes: { delivery: "48 hours" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-6",
    title: "The Art of Simple Living (E-book)",
    slug: "art-of-simple-living-ebook",
    description:
      "A practical e-book on habits, focus, and daily routines. Instant download after purchase.",
    productType: "EBOOK",
    price: "149.00",
    currency: "INR",
    store: { id: "store-3", name: "StudyPoint", slug: "studypoint" },
    category: { id: "cat-ebooks", name: "E-books", slug: "ebooks" },
    media: [
      { url: "/images/products/ebook.jpg", alt: "The Art of Simple Living e-book cover" },
    ],
    attributes: { format: "EPUB + PDF" },
    createdAt: new Date().toISOString(),
  },
];

export function getDemoListingBySlug(slug: string) {
  return DEMO_LISTINGS.find((l) => l.slug === slug) ?? null;
}

export function searchDemoListings(opts: {
  q?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}) {
  let list = [...DEMO_LISTINGS];
  if (opts.q) {
    const q = opts.q.toLowerCase();
    list = list.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q) ||
        l.store.name.toLowerCase().includes(q)
    );
  }
  if (opts.type) {
    list = list.filter((l) => l.productType === opts.type);
  }
  if (opts.minPrice !== undefined) {
    list = list.filter((l) => Number(l.price) >= opts.minPrice!);
  }
  if (opts.maxPrice !== undefined) {
    list = list.filter((l) => Number(l.price) <= opts.maxPrice!);
  }
  if (opts.sort === "price_asc") {
    list.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (opts.sort === "price_desc") {
    list.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (opts.sort === "title") {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }
  return list;
}
