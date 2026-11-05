import { describe, expect, it } from "vitest";
import { analyseReviews, reviewEvidence } from "./analyse";

const now = new Date("2026-11-06T00:00:00Z");
const day = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("analyseReviews", () => {
  it("handles no reviews honestly", () => {
    const s = analyseReviews([], now);
    expect(s.count).toBe(0);
    expect(s.average).toBeNull();
    expect(reviewEvidence("Thing", s)).toContain("no reviews yet");
  });

  it("computes average and distribution and flags few reviews", () => {
    const s = analyseReviews(
      [
        { rating: 5, createdAt: day(1) },
        { rating: 4, createdAt: day(2) },
        { rating: 1, createdAt: day(3) },
      ],
      now
    );
    expect(s.count).toBe(3);
    expect(s.average).toBe(3.3);
    expect(s.distribution[5]).toBe(1);
    expect(s.distribution[1]).toBe(1);
    expect(s.few).toBe(true);
    expect(reviewEvidence("Thing", s)).toContain("small sample");
  });

  it("finds praise and complaints, and respects negation", () => {
    const s = analyseReviews(
      [
        { rating: 5, body: "Great quality and very comfortable.", createdAt: day(5) },
        { rating: 5, body: "Excellent build quality. Worth the price.", createdAt: day(6) },
        { rating: 2, body: "Delivery was very late and packaging was bad.", createdAt: day(7) },
        { rating: 2, body: "Not comfortable at all, size runs small", createdAt: day(8) },
        { rating: 1, body: "Delivery delayed again, worst service", createdAt: day(9) },
      ],
      now
    );
    expect(s.positiveThemes.map((t) => t.theme)).toContain("quality");
    expect(s.negativeThemes.map((t) => t.theme)).toContain("delivery");
    expect(s.negativeThemes.map((t) => t.theme)).toContain("comfort");
    expect(s.quotes.length).toBeGreaterThan(0);
    expect(s.few).toBe(false);
  });

  it("detects an improving trend", () => {
    const s = analyseReviews(
      [
        { rating: 1, createdAt: day(120) },
        { rating: 2, createdAt: day(100) },
        { rating: 5, createdAt: day(10) },
        { rating: 5, createdAt: day(3) },
      ],
      now
    );
    expect(s.trend.direction).toBe("improving");
  });

  it("says not enough reviews for a trend with fewer than four", () => {
    expect(analyseReviews([{ rating: 5, createdAt: day(1) }], now).trend.direction).toBe("not enough reviews");
  });
});
