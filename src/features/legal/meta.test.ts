import { describe, expect, it } from "vitest";
import { copyrightText, currentYear, LAST_UPDATED } from "./meta";

describe("legal meta", () => {
  it("computes the year from the date", () => {
    expect(currentYear(new Date("2027-03-01T10:00:00"))).toBe(2027);
    expect(currentYear(new Date("2031-06-01T10:00:00"))).toBe(2031);
  });
  it("builds the copyright text", () => {
    expect(copyrightText(new Date("2029-06-01T10:00:00"))).toBe("© 2029 ShopNGo.");
  });
  it("has a readable last updated date", () => {
    expect(LAST_UPDATED).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
  });
});
