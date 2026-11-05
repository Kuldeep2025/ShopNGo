import { describe, expect, it } from "vitest";
import { detectLanguage, directAnswer, budgetFrom } from "./directAnswer";

const ev = [
  "Title: Dell Laptop 14 - Silver\nType: PHYSICAL\nCategory: Electronics\nPrice: INR 42000.00\nStore: TechHub",
  "Title: Budget Laptop Lite\nType: PHYSICAL\nCategory: Electronics\nPrice: INR 21000\nStore: MegaMart",
  "Title: Cotton Shirt\nType: PHYSICAL\nCategory: Clothing\nPrice: INR 450\nStore: StyleCo",
  "Title: Notebook Pack\nType: PHYSICAL\nCategory: Books\nPrice: INR 120\nStore: StyleCo",
];

describe("language", () => {
  it("detects scripts", () => {
    expect(detectLanguage("what is the cheapest laptop?")).toBe("en");
    expect(detectLanguage("mere paas 500 rupaye hain kya milega")).toBe("hinglish");
    expect(detectLanguage("सबसे सस्ता लैपटॉप कौन सा है")).toBe("hi");
  });
  it("reads budgets", () => {
    expect(budgetFrom("mere paas 500 rupaye hain")).toBe(500);
    expect(budgetFrom("gift under 1000")).toBe(1000);
    expect(budgetFrom("hello")).toBeNull();
  });
});

describe("directAnswer from comparison summaries", () => {
  const sum = [
    "Summary: Glyph Laptop Stand: only SoundHive Tech sells it, at Rs 409.\nx",
    "Summary: Glyph Pure Business Laptop is sold by 2 stores. Cheapest: TechHub at Rs 42000, saving Rs 500 against the highest price.\nx",
  ];
  it("prefers the item that matches the asked noun and gives one answer", () => {
    const a = directAnswer("what is the cheapest laptop?", sum);
    expect(a).toBe("The cheapest is Glyph Pure Business Laptop at Rs 42000, from TechHub.");
  });
});

describe("directAnswer", () => {
  it("answers cheapest with one product", () => {
    const a = directAnswer("what is the cheapest laptop?", ev);
    expect(a).toContain("Budget Laptop Lite");
    expect(a).not.toContain("Cotton");
    expect(a).toContain("Rs 21000");
  });
  it("answers in Roman Hindi for a budget, without dumping everything", () => {
    const a = directAnswer("mere paas 500 rupaye hain kya milega", ev);
    expect(a).toMatch(/Sabse achhe options/);
    expect(a).toContain("Cotton Shirt Rs 450");
    expect(a).not.toContain("Laptop");
  });
  it("answers a price question directly", () => {
    expect(directAnswer("price of cotton shirt", ev)).toBe("Cotton Shirt is Rs 450 at StyleCo.");
  });
  it("answers developers", () => {
    expect(directAnswer("Who built this website?", [])).toContain("Kuldeep Behera");
  });
  it("says briefly when nothing matches", () => {
    expect(directAnswer("asdf qwerty zzz", [])).toBe("I could not find that on ShopNGo.");
    expect(directAnswer("zzzz qqqq kya hai", ev)).toMatch(/nahi mila/);
  });
});
