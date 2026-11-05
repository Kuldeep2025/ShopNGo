/**
 * Offline direct answer, used only when every AI provider fails.
 * It reads the evidence gathered for this question and answers just what was asked,
 * in the shopper's own language (English, Hindi script or Roman Hindi). It never lists everything.
 */
import { TEAM } from "@/features/about/team";

export type Lang = "en" | "hi" | "hinglish";

const HINGLISH_WORDS = /\b(kya|hai|hain|hoga|mere|mera|meri|paas|kitna|kitne|kitni|kaun|kaise|kaisa|kisne|banaya|chahiye|milega|milegi|rupaye|rupay|sasta|sasti|dikhao|batao|bata|nahi|aur|ke|ki|ka|ko|se|mein|me|wala|wali|dukan)\b/i;

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
  if (/(which|what|kaun|konsi|kaunse|कौन).*(store|shop|dukan|stores)|\bstores?\b|दुकान/.test(q) && live) {
    const line = live.split("\n").find((l) => l.startsWith("Stores:"));
    const names = line?.slice(7).split(/\),\s*/).map((s) => s.replace(/\s*\(\d+\)\.?$/, "").trim()).filter(Boolean).slice(0, 5);
    if (names?.length) return TXT.stores[lang](names.join(", "));
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
      found.push({ name: m[1]!, store: m[2]!, amount: `Rs ${m[3]}`, hit: toks.includes(last) });
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
