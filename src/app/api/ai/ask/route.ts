import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { rateLimit } from "@/lib/security/rateLimit";
import { groundedAsk } from "@/features/ai/ask";
import { budgetFrom } from "@/features/ai/directAnswer";
import { buildExtraEvidence } from "@/features/ai/evidenceExtras";
import { isPubliclyVisible } from "@/features/catalogue";
import { searchDemoListings } from "@/lib/demo-data";
import { z } from "zod";

const askSchema = z.object({
  question: z.string().min(3).max(1000),
  listingId: z.string().optional(),
});

/**
 * POST /api/ai/ask
 * Grounded AI Ask – open to guests, free models only, falls back when unavailable.
 */
export async function POST(req: NextRequest) {
  try {
    // Open to guests. Only a light per-IP guard (no daily caps).
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const limit = rateLimit(`ai:ip:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many questions at once. Please wait a minute and try again." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = askSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const snippets: string[] = [];

    // Budget hint such as "under 1000 rupees" so gift or price questions get matching products.
    const budget = budgetFrom(parsed.data.question);
    const wantsCheapest = /cheap|lowest|sasta|sasti|सस्ता/i.test(parsed.data.question);
    // Roman Hindi and filler words that never name a product.
    const STOP_EXTRA = ["mere", "paas", "hain", "kya", "milega", "milegi", "rupaye", "rupees", "who", "this", "that", "website", "built", "made", "kitna", "kitne", "kaun", "cheapest", "price", "show", "tell", "give", "can", "buy", "want", "need", "chahiye", "batao"];

    // Token-based demo matching: the raw question ("How much are the
    // wireless earbuds?") rarely substring-matches titles, so score by
    // meaningful word overlaps and take the top hits.
    const pushDemoSnippets = () => {
      const stop = new Set(["the", "a", "an", "for", "of", "are", "is", "how", "much", "what", "do", "i", "and", "with", "in", "to", "on"]);
      const tokens = parsed.data.question
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 3 && !stop.has(t));
      const scored = searchDemoListings({})
        .filter((l) => budget === null || Number(l.price) <= budget)
        .map((l) => {
          const hay = `${l.title} ${l.description ?? ""} ${l.category?.name ?? ""}`.toLowerCase();
          return { l, score: tokens.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0) };
        })
        .sort((a, b) => b.score - a.score)
        .filter((x) => x.score > 0)
        .slice(0, 5);
      const picks = (scored.length ? scored.map((x) => x.l) : searchDemoListings({}).filter((l) => budget === null || Number(l.price) <= budget).slice(0, 5));
      for (const l of picks) {
        snippets.push(
          `Title: ${l.title}\nType: ${l.productType}\nPrice: ${l.currency} ${l.price}\nDescription: ${l.description ?? "N/A"}\nStore: ${l.store.name}`
        );
      }
    };

    if (isDatabaseConfigured() && prisma) {
      if (parsed.data.listingId) {
        const listing = await prisma.listing.findUnique({
          where: { id: parsed.data.listingId },
          include: { store: true, category: true },
        });
        if (listing && isPubliclyVisible(listing)) {
          snippets.push(
            `Title: ${listing.title}\nType: ${listing.productType}\nPrice: ${listing.currency} ${listing.price}\nDescription: ${listing.description ?? "N/A"}\nStore: ${listing.store.name}`
          );
        }
      } else {
        // Search top matching approved listings
        const listings = await prisma.listing.findMany({
          where: {
            status: "APPROVED",
            store: { isActive: true },
            ...(budget !== null ? { price: { lte: budget } } : {}),
            OR: (() => {
              const stop = new Set(["the", "and", "for", "are", "how", "much", "what", "which", "with", "have", "you", "your", "does", "any", ...STOP_EXTRA]);
              const words = parsed.data.question
                .toLowerCase()
                .split(/[^a-z0-9]+/)
                .filter((t) => t.length >= 3 && !stop.has(t))
                .slice(0, 6);
              const terms = words.length ? words : [parsed.data.question.slice(0, 50)];
              return terms.flatMap((w) => [
                { title: { contains: w, mode: "insensitive" as const } },
                { description: { contains: w, mode: "insensitive" as const } },
              ]);
            })(),
          },
          include: { store: true, category: true },
          ...(wantsCheapest ? { orderBy: { price: "asc" as const } } : budget !== null ? { orderBy: { price: "desc" as const } } : {}),
          take: 6,
        });
        let found = listings;
        if (found.length === 0) {
          found = await prisma.listing.findMany({
            where: { status: "APPROVED", store: { isActive: true }, ...(budget !== null ? { price: { lte: budget } } : {}) },
            include: { store: true, category: true },
            orderBy: { createdAt: "desc" },
            take: 8,
          });
        }
        for (const l of found) {
          if (isPubliclyVisible(l)) {
            snippets.push(
              `Title: ${l.title}\nType: ${l.productType}\nCategory: ${l.category?.name ?? "N/A"}\nPrice: ${l.currency} ${l.price}\nStock: ${l.stock ?? "n/a"}\nDescription: ${(l.description ?? "N/A").slice(0, 300)}\nStore: ${l.store.name}`
            );
          }
        }
      }
    } else {
      // Demo catalogue fallback so the assistant stays useful without a database
      pushDemoSnippets();
    }

    // Price comparison across stores and a summary of every review go first so they are never cut off.
    const extra = await buildExtraEvidence(parsed.data.question, parsed.data.listingId).catch(() => [] as string[]);
    const result = await groundedAsk(parsed.data.question, [...extra, ...snippets]);
    return NextResponse.json({ ...result, evidence: undefined });
  } catch (err) {
    console.error("ai ask error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
