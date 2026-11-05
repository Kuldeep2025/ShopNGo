import { describe, expect, it } from "vitest";
import { buildExtraEvidence, detectIntent } from "./evidenceExtras";

describe("assistant intent", () => {
  it("spots price comparison questions", () => {
    expect(detectIntent("Which is cheaper, earbuds from store A or store B?").compare).toBe(true);
    expect(detectIntent("sabse sasta kurta kaun sa hai").compare).toBe(true);
  });
  it("spots review questions", () => {
    expect(detectIntent("What do people say about the quality? Any reviews?").reviews).toBe(true);
    expect(detectIntent("is it good, what is the rating").reviews).toBe(true);
  });
  it("adds nothing for unrelated questions or when there is no database", async () => {
    expect(await buildExtraEvidence("Who built ShopNGo?")).toEqual([]);
    expect(await buildExtraEvidence("cheapest earbuds")).toEqual([]);
  });
});
