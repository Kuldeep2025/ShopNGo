import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rateLimit";
import { groundedAsk } from "@/features/ai/ask";
import { isPubliclyVisible } from "@/features/catalogue";
import { searchDemoListings } from "@/lib/demo-data";
import { z } from "zod";

const askSchema = z.object({
  question: z.string().min(3).max(4000),
  listingId: z.string().optional(),
});

/**
 * POST /api/ai/ask
 * Grounded AI Ask – free models only, falls back when unavailable.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req.headers.get("authorization"));
    const userLimit = rateLimit(
      `ai:user:${user?.id ?? "guest"}`,
      Number(process.env.AI_USER_DAILY_REQUEST_LIMIT ?? 10),
      86_400_000
    );
    const globalLimit = rateLimit(
      "ai:global",
      Number(process.env.AI_GLOBAL_DAILY_REQUEST_LIMIT ?? 40),
      86_400_000
    );
    if (!userLimit.allowed || !globalLimit.allowed) {
      return NextResponse.json({ error: "Daily AI request limit reached" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = askSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const snippets: string[] = [];

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
        .map((l) => {
          const hay = `${l.title} ${l.description ?? ""} ${l.category?.name ?? ""}`.toLowerCase();
          return { l, score: tokens.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0) };
        })
        .sort((a, b) => b.score - a.score)
        .filter((x) => x.score > 0)
        .slice(0, 5);
      const picks = (scored.length ? scored.map((x) => x.l) : searchDemoListings({}).slice(0, 5));
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
            OR: (() => {
              const stop = new Set(["the", "and", "for", "are", "how", "much", "what", "which", "with", "have", "you", "your", "does", "any"]);
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
          include: { store: true },
          take: 5,
        });
        for (const l of listings) {
          if (isPubliclyVisible(l)) {
            snippets.push(
              `Title: ${l.title}\nType: ${l.productType}\nPrice: ${l.currency} ${l.price}\nStore: ${l.store.name}`
            );
          }
        }
      }
    } else {
      // Demo catalogue fallback so the assistant stays useful without a database
      pushDemoSnippets();
    }

    const result = await groundedAsk(parsed.data.question, snippets);
    return NextResponse.json(result);
  } catch (err) {
    console.error("ai ask error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
