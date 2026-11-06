import { describe, expect, it } from "vitest";
import { detectLanguage, directAnswer, budgetFrom, canAnswerDirectly } from "./directAnswer";

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
    expect(a).toBe("The cheapest is Glyph Pure Business Laptop at Rs 42000 from TechHub.");
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

const head = (kind: string, quality = "exact", extra = "") =>
  `Search: live database, read just now\nAsked about: earbuds\nKind: ${kind}\nMatch quality: ${quality}\nMatching products: 2${extra}`;
const earbuds = [
  "Title: Boat Airdopes 141\nCategory: Earbuds\nPrice: INR 999\nStock: 10\nStore: SoundHive Tech\nRank: CHEAPEST MATCH",
  "Title: Sony WF Earbuds\nCategory: Earbuds\nPrice: INR 4999\nStock: 3\nStore: TechHub",
];

describe("directAnswer from live search evidence", () => {
  it("gives one short Roman Hindi sentence for the cheapest", () => {
    const q = "cheapest earbuds kaunsa hai";
    const ev = [head("cheapest"), ...earbuds];
    expect(canAnswerDirectly(q, ev)).toBe(true);
    const a = directAnswer(q, ev);
    expect(a).toBe("Sabse sasta Boat Airdopes 141 hai, Rs 999, SoundHive Tech par.");
    expect(a).not.toContain("Sony");
  });
  it("answers the cheapest in English", () => {
    expect(directAnswer("cheapest earbuds", [head("cheapest"), ...earbuds])).toBe("The cheapest is Boat Airdopes 141 at Rs 999 from SoundHive Tech.");
  });
  it("answers a price question in Roman Hindi", () => {
    const q = "earbuds kitne ka hai";
    const ev = [head("match"), ...earbuds];
    expect(canAnswerDirectly(q, ev)).toBe(true);
    expect(directAnswer(q, ev)).toBe("Boat Airdopes 141 ka daam Rs 999 hai, SoundHive Tech par.");
  });
  it("answers where to buy in Roman Hindi and English", () => {
    const ev = [head("match"), ...earbuds];
    expect(directAnswer("earbuds kahan milega", ev)).toBe("Boat Airdopes 141 SoundHive Tech par milta hai, Rs 999.");
    expect(directAnswer("where can I buy earbuds", ev)).toBe("Boat Airdopes 141 is at SoundHive Tech, Rs 999.");
  });
  it("names the most expensive", () => {
    expect(directAnswer("sabse mehenga earbuds kaunsa hai", [head("priciest"), earbuds[1]!, earbuds[0]!])).toBe("Sabse mehenga Sony WF Earbuds hai, Rs 4999, TechHub par.");
  });
  it("replies briefly in the shopper's language when nothing matches", () => {
    const none = [head("match", "none", "")];
    expect(canAnswerDirectly("dragon fruit kitne ka hai", none)).toBe(false);
    expect(directAnswer("dragon fruit kitne ka hai", none)).toBe("Ye ShopNGo par nahi mila.");
    expect(directAnswer("price of dragon fruit", none)).toBe("I could not find that on ShopNGo.");
  });
  it("leaves open questions to the model", () => {
    expect(canAnswerDirectly("suggest a good gift for my sister", [head("match"), ...earbuds])).toBe(false);
  });
});
