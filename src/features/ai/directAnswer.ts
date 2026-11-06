/**
 * Offline direct answer, used only when every AI provider fails.
 * It reads the evidence gathered for this question and answers just what was asked,
 * in the shopper's own language (English, Hindi script or Roman Hindi). It never lists everything.
 */
import { TEAM } from "@/features/about/team";

export type Lang = "en" | "hi" | "hinglish";

const HINGLISH_WORDS = /\b(kya|hai|hain|hoga|mere|mera|meri|paas|kitna|kitne|kitni|kaun|kaise|kaisa|kisne|banaya|chahiye|milega|milegi|rupaye|rupay|sasta|sasti|dikhao|batao|bata|nahi|aur|ke|ki|ka|ko|se|mein|me|wala|wali|dukan|kaunsa|kaunsi|kaunse|konsa|konsi|konse|milta|milti|milte|sabse|mujhe|aapke|batana|bataiye|dikhana|acha|achha|accha|sastha|mehenga|mehnga|kitna|daam|dam|yahan|yaha|isme|iska|iski|inme|unme|bhai|yaar|hota|hoti|karta|karti|kar|liye|toh|bhi|mein|nahin)\b/i;

export function detectLanguage(q: string): Lang {
  if (/[ऀ-ॿ]/.test(q)) return "hi";
  const hits = (q.toLowerCase().match(new RegExp(HINGLISH_WORDS.source, "gi")) ?? []).length;
  return hits >= 1 ? "hinglish" : "en";
}

const TXT = {
  notFound: {
    en: "I could not find that on ShopNGo.",
    hi: "यह ShopNGo पर नहीं मिला।",
    hinglish: "Ye ShopNGo par nahi mila.",
  },
  noBudget: {
    en: (b: number) => `I found nothing under Rs ${b} right now.`,
    hi: (b: number) => `अभी Rs ${b} के अंदर कुछ नहीं मिला।`,
    hinglish: (b: number) => `Abhi Rs ${b} ke andar kuch nahi mila.`,
  },
  cheapest: {
    en: (t: string, p: string, s: string) => `The cheapest is ${t} at ${p}${s ? ` from ${s}` : ""}.`,
    hi: (t: string, p: string, s: string) => `सबसे सस्ता ${t} है, ${p}${s ? `, ${s} पर` : ""}।`,
    hinglish: (t: string, p: string, s: string) => `Sabse sasta ${t} hai, ${p}${s ? `, ${s} par` : ""}.`,
  },
  one: {
    en: (t: string, p: string, s: string) => `${t} is ${p}${s ? ` at ${s}` : ""}.`,
    hi: (t: string, p: string, s: string) => `${t} का दाम ${p} है${s ? `, ${s} पर` : ""}।`,
    hinglish: (t: string, p: string, s: string) => `${t} ka daam ${p} hai${s ? `, ${s} par` : ""}.`,
  },
  priciest: {
    en: (t: string, p: string, s: string) => `The most expensive is ${t} at ${p}${s ? ` from ${s}` : ""}.`,
    hi: (t: string, p: string, s: string) => `सबसे महंगा ${t} है, ${p}${s ? `, ${s} पर` : ""}।`,
    hinglish: (t: string, p: string, s: string) => `Sabse mehenga ${t} hai, ${p}${s ? `, ${s} par` : ""}.`,
  },
  closest: {
    en: (w: string, t: string, p: string, s: string) => `No "${w}" on ShopNGo. The closest is ${t} at ${p}${s ? ` from ${s}` : ""}.`,
    hi: (w: string, t: string, p: string, s: string) => `ShopNGo पर "${w}" नहीं है। सबसे पास का ${t} है, ${p}${s ? `, ${s} पर` : ""}।`,
    hinglish: (w: string, t: string, p: string, s: string) => `ShopNGo par "${w}" nahi hai. Sabse paas ka ${t} hai, ${p}${s ? `, ${s} par` : ""}.`,
  },
  where: {
    en: (t: string, p: string, s: string) => `${t} is at ${s || "ShopNGo"}, ${p}.`,
    hi: (t: string, p: string, s: string) => `${t} ${s || "ShopNGo"} पर मिलता है, ${p}।`,
    hinglish: (t: string, p: string, s: string) => `${t} ${s || "ShopNGo"} par milta hai, ${p}.`,
  },
  storeSells: {
    en: (n: string, items: string) => `${n} sells: ${items}.`,
    hi: (n: string, items: string) => `${n} पर मिलता है: ${items}।`,
    hinglish: (n: string, items: string) => `${n} par milta hai: ${items}.`,
  },
  few: {
    en: (items: string) => `Top matches: ${items}.`,
    hi: (items: string) => `सबसे अच्छे विकल्प: ${items}।`,
    hinglish: (items: string) => `Sabse achhe options: ${items}.`,
  },
  team: {
    en: (items: string) => `ShopNGo was built by three students: ${items}.`,
    hi: (items: string) => `ShopNGo को तीन छात्रों ने बनाया है: ${items}।`,
    hinglish: (items: string) => `ShopNGo ko teen students ne banaya hai: ${items}.`,
  },
  stores: {
    en: (items: string) => `Stores on ShopNGo include ${items}.`,
    hi: (items: string) => `ShopNGo पर ये स्टोर हैं: ${items}।`,
    hinglish: (items: string) => `ShopNGo par ye stores hain: ${items}.`,
  },
  seller: {
    en: "To sell, sign in, apply at /seller/apply, wait for approval, then add listings at /seller/listings.",
    hi: "बेचने के लिए साइन इन करें, /seller/apply पर आवेदन करें, मंज़ूरी के बाद /seller/listings पर प्रोडक्ट जोड़ें।",
    hinglish: "Bechne ke liye sign in karo, /seller/apply par apply karo, approval ke baad /seller/listings par product jodo.",
  },
  delivery: {
    en: "To deliver, sign in and apply at /delivery/apply. After approval, go online at /delivery.",
    hi: "डिलीवरी के लिए साइन इन करें और /delivery/apply पर आवेदन करें। मंज़ूरी के बाद /delivery पर ऑनलाइन हों।",
    hinglish: "Delivery ke liye sign in karo aur /delivery/apply par apply karo. Approval ke baad /delivery par online ho jao.",
  },
} as const;

const price = (raw: string) => {
  const m = raw.match(/([\d,]+(?:\.\d+)?)/);
  if (!m) return raw;
  const n = Number(m[1]!.replace(/,/g, ""));
  return `Rs ${Number.isInteger(n) ? n : n.toFixed(2)}`;
};

interface Item { title: string; price: number; priceText: string; store: string; score: number }

const STOP = new Set(["the", "and", "for", "are", "how", "much", "what", "which", "with", "have", "you", "your", "does", "any", "cheapest", "price", "cost", "kya", "hai", "hain", "mere", "paas", "kitna", "kitne", "milega", "rupaye", "rupees", "under", "below", "available", "show", "tell", "give", "best", "sasta", "batao", "chahiye"]);

function tokens(q: string): string[] {
  return q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t));
}

function parseItems(evidence: string[], q: string): Item[] {
  const toks = tokens(q);
  const out: Item[] = [];
  for (const e of evidence) {
    const get = (k: string) => e.split("\n").find((l) => l.startsWith(`${k}:`))?.slice(k.length + 1).trim();
    const title = get("Title");
    const p = get("Price");
    if (!title || !p) continue;
    const num = Number((p.match(/[\d,]+(?:\.\d+)?/)?.[0] ?? "").replace(/,/g, ""));
    if (!Number.isFinite(num)) continue;
    const hay = `${title} ${get("Category") ?? ""}`.toLowerCase();
    out.push({ title: title.split(/\s[-–—]\s/)[0]!.slice(0, 80), price: num, priceText: price(p), store: get("Store") ?? "", score: toks.filter((t) => hay.includes(t)).length });
  }
  return out;
}


interface SearchInfo {
  kind: "cheapest" | "priciest" | "match";
  quality: string;
  missing: string[];
  items: { title: string; price: string; store: string }[];
  storeLine?: { name: string; what: string };
}

/** Reads the "Search:" evidence block and the product blocks after it. Null when there was no search. */
export function parseSearch(evidence: string[]): SearchInfo | null {
  const head = evidence.find((e) => e.startsWith("Search:"));
  const storeBlock = evidence.find((e) => e.startsWith("Store: ") && e.includes("What it sells"));
  if (!head && !storeBlock) return null;
  const get = (e: string, k: string) => e.split("\n").find((l) => l.startsWith(`${k}:`))?.slice(k.length + 1).trim();
  const items = evidence
    .filter((e) => e.startsWith("Title:") && e.includes("\nRank:") || (head && e.startsWith("Title:")))
    .map((e) => ({ title: (get(e, "Title") ?? "").split(/\s[-–—]\s/)[0]!.slice(0, 80), price: get(e, "Price") ?? "", store: get(e, "Store") ?? "" }))
    .filter((i) => i.title && i.price);
  const missingLine = head ? head.split("\n").find((l) => l.startsWith("No product is called or categorised as:")) : undefined;
  const missing = missingLine ? missingLine.slice(missingLine.indexOf(":") + 1).split(".")[0]!.split(",").map((x) => x.trim()).filter(Boolean) : [];
  return {
    kind: (get(head ?? "", "Kind") as SearchInfo["kind"]) || "match",
    quality: get(head ?? "", "Match quality") ?? "none",
    missing,
    items,
    storeLine: storeBlock ? { name: get(storeBlock, "Store") ?? "", what: get(storeBlock, "What it sells (category and count)") ?? "" } : undefined,
  };
}

const WANTS_WHERE = /\bwhere\b|which (store|shop)|kahan|kahaan|kaha\b|konsi dukan|kaunsi dukan|कहाँ|कहां|कौन सी दुकान/;

/**
 * True when the live search evidence already holds a clear single answer (cheapest, most expensive,
 * a price, or where to buy), so the reply can be built straight from the database rows in the
 * shopper's own language, with no model in between.
 */
export function canAnswerDirectly(question: string, evidence: string[]): boolean {
  const search = parseSearch(evidence);
  if (!search || search.items.length === 0 || search.quality === "none") return false;
  if (budgetFrom(question) !== null) return false;
  if (search.kind === "cheapest" || search.kind === "priciest") return true;
  return WANTS_WHERE.test(question.toLowerCase()) || /price|cost|kitna|kitne|kitni|daam|dam\b|kimat|keemat|rate|how much|दाम|कीमत|कितन/i.test(question);
}

export function budgetFrom(q: string): number | null {
  const l = q.toLowerCase();
  const m =
    l.match(/(?:under|below|within|less than|upto|up to|budget|tak|se kam)\s*(?:of\s*)?(?:rs\.?|inr|₹)?\s*(\d{2,7})/) ??
    l.match(/(?:rs\.?|inr|₹)\s*(\d{2,7})/) ??
    l.match(/(\d{2,7})\s*(?:rupaye|rupay|rupees|rupee|rs\b|inr|₹|रुपये|रुपए)/);
  return m ? Number(m[1]) : null;
}

export function directAnswer(question: string, evidence: string[], live?: string): string {
  const lang = detectLanguage(question);
  const q = question.toLowerCase();

  if (/who (built|made|created|developed)|developer|creator|\bteam\b|kisne|banaya|banai|banane|किसने|बनाया|डेवलपर/.test(q)) {
    return TXT.team[lang](TEAM.map((m) => `${m.name} (${m.role.split(",")[0]!.toLowerCase()})`).join(", "));
  }
  if (/(sell|seller|bechna|bechne|बेचन)/.test(q) && /(how|become|apply|kaise|start|banna|कैसे)/.test(q)) return TXT.seller[lang];
  if (/(deliver|delivery partner|rider)/.test(q) && /(how|become|apply|kaise|join|कैसे)/.test(q)) return TXT.delivery[lang];
  if (/(which|what|kaun|konsi|kaunse|कौन).*(store|shop|dukan|stores)|\bstores?\b|दुकान/.test(q) && live && !evidence.some((e) => e.startsWith("Search:"))) {
    const line = live.split("\n").find((l) => l.startsWith("Stores:"));
    const names = line?.slice(7).split(/\),\s*/).map((s) => s.replace(/\s*\(\d+\)\.?$/, "").trim()).filter(Boolean).slice(0, 5);
    if (names?.length) return TXT.stores[lang](names.join(", "));
  }


  // Live search evidence (written by the retrieval step for this very question) answers directly.
  const search = parseSearch(evidence);
  if (search) {
    const first = search.items[0];
    if (!first) {
      if (search.storeLine) return TXT.storeSells[lang](search.storeLine.name, search.storeLine.what);
      return TXT.notFound[lang];
    }
    const amount = price(first.price);
    if (search.missing.length > 0) return TXT.closest[lang](search.missing[0]!, first.title, amount, first.store);
    if (search.kind === "cheapest") return TXT.cheapest[lang](first.title, amount, first.store);
    if (search.kind === "priciest") return TXT.priciest[lang](first.title, amount, first.store);
    if (budgetFrom(question) === null && WANTS_WHERE.test(q)) return TXT.where[lang](first.title, amount, first.store);
    if (budgetFrom(question) !== null || search.items.length > 1 && !/price|cost|kitna|kitne|daam|दाम|कीमत|how much/.test(q)) {
      return TXT.few[lang](search.items.slice(0, 3).map((i) => `${i.title} ${price(i.price)}`).join(", "));
    }
    return TXT.one[lang](first.title, amount, first.store);
  }

  // Price comparison summaries name the exact item and its cheapest store: use the best matching one.
  const wantsPrice = /cheap|lowest|sasta|sasti|सस्ता|price|cost|kitna|kitne|daam|दाम|कीमत/.test(q);
  if (wantsPrice && budgetFrom(question) === null) {
    const toks = tokens(question);
    const found: { name: string; store: string; amount: string; hit: boolean }[] = [];
    for (const e of evidence) {
      const line = e.split("\n").find((l) => l.startsWith("Summary:"));
      const m =
        line?.match(/^Summary: (.+?) is sold by \d+ stores\. Cheapest: (.+?) at Rs ([\d,.]+)/) ??
        line?.match(/^Summary: (.+?): only (.+?) sells it, at Rs ([\d,.]+)/);
      if (!m) continue;
      const last = m[1]!.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).pop() ?? "";
      found.push({ name: m[1]!, store: m[2]!, amount: `Rs ${m[3]!.replace(/[.,]+$/, "")}`, hit: toks.includes(last) });
    }
    const pick = found.find((f) => f.hit) ?? found[0];
    if (pick) return (/cheap|lowest|sasta|sasti|सस्ता/.test(q) ? TXT.cheapest : TXT.one)[lang](pick.name, pick.amount, pick.store);
  }

  // Price comparison and review analysis evidence already holds the answer in one sentence.
  const sums = evidence.map((e) => e.split("\n").find((l) => l.startsWith("Summary:"))?.slice(8).trim()).filter((x): x is string => Boolean(x));
  if (sums.length > 0) return sums.slice(0, 2).join(" ");

  const items = parseItems(evidence, question);
  const budget = budgetFrom(question);
  const wantsCheapest = /cheap|lowest|sasta|sasti|सस्ता|least expensive/.test(q);
  const pool = budget !== null ? items.filter((i) => i.price <= budget) : items;
  const maxScore = Math.max(0, ...pool.map((i) => i.score));
  const relevant = budget !== null && maxScore === 0 ? pool : pool.filter((i) => i.score === maxScore && (maxScore > 0 || wantsCheapest));

  if (relevant.length === 0) {
    if (budget !== null) return TXT.noBudget[lang](budget);
    return TXT.notFound[lang];
  }
  if (wantsCheapest) {
    const c = [...relevant].sort((a, b) => a.price - b.price)[0]!;
    return TXT.cheapest[lang](c.title, c.priceText, c.store);
  }
  if (budget !== null) {
    const best = [...relevant].sort((a, b) => b.score - a.score || b.price - a.price).slice(0, 3);
    return TXT.few[lang](best.map((i) => `${i.title} ${i.priceText}`).join(", "));
  }
  if (relevant.length === 1 || maxScore >= 2) {
    const i = relevant[0]!;
    return TXT.one[lang](i.title, i.priceText, i.store);
  }
  return TXT.few[lang](relevant.slice(0, 3).map((i) => `${i.title} ${i.priceText}`).join(", "));
}
