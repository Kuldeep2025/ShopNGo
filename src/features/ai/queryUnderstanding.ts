/**
 * Pure helpers that turn a shopper's question (English, Hindi script or Roman Hindi) into search
 * concepts with synonyms, and score listings against them. No database access here.
 */

/** Words that never name a product: English, Roman Hindi and site words. */
const STOP = new Set((
  "the and for are how much many what which with have has you your does any can could would should will shall please " +
  "show tell give get find want need buy bought sell sells sold buying looking look search about from this that these those " +
  "there here where when who whom whose why best top good better cheap cheaper cheapest cheapes lowest least lower most expensive " +
  "costly costliest highest price prices pricing cost costs rate rates rupees rupee rupaye rupay inr under below within upto " +
  "less than over above around budget one some all item items product products thing things stuff available stock list " +
  "shopngo shop shopn website site store stores app online kind type types ones also only just like very really more " +
  "kya hai hain hoga hogi honge tha thi the mera meri mere mujhe mujhko hume humein aap aapke tum tumhare apna apni " +
  "kaun kaunsa kaunsi kaunse konsa konsi konse kon kis kisko kisse kisne kab kaha kahan kahaa kaise kaisa kaisi kitna kitne kitni kitnaa " +
  "ka ki ke ko se me mein mai main par pe pr tak wala wali wale waala waali liye lie ek aur ya bhi toh to hi nahi nahin na " +
  "milta milti milte milega milegi milenge mil sakta sakti sakte chahiye chahie dikhao dikha batao bata bataiye bataye dena do de " +
  "sabse sab sara saare sasta sasti sastha mehenga mehnga mahenga acha achha accha achhi achhe zyada jyada kam thoda bahut " +
  "daam dam kimat keemat rate bhav bhaav paas rakhte rakhta hota hoti hote lena lene liya karo kare karna kar kara " +
  "is ho hu hun are am was were been being be do did done make made built who ask asked question " +
  "ji bhai yaar sir madam hello hi hey namaste kripya please plz pls abhi aaj kal naya nayi naye new latest " +
  "of in on at to it its if or as by an a i my me we us our they them their he she his her not no yes yeah okay ok"
).split(/\s+/));

/** Groups of words that mean the same kind of product. Order inside a group does not matter. */
export const CONCEPTS: string[][] = [
  ["earbud", "earphone", "headphone", "headset", "bud", "tws", "airpod", "airdope", "neckband", "iem", "earpod", "handsfree", "hansfree"],
  ["phone", "smartphone", "mobile", "iphone", "android", "handset", "cellphone", "fon", "foun"],
  ["laptop", "macbook", "chromebook", "computer", "pc"],
  ["tv", "television", "led", "oled", "qled", "smarttv"],
  ["shoe", "sneaker", "footwear", "joota", "joote", "juta", "jute", "boot", "sandal", "slipper", "chappal", "chapal", "loafer", "flipflop"],
  ["shirt", "tshirt", "tee", "kurta"],
  ["jean", "denim", "trouser", "pant", "paint", "pajama", "lower"],
  ["watch", "smartwatch", "ghadi", "wristwatch", "band", "tracker"],
  ["speaker", "soundbar", "boombox", "woofer"],
  ["charger", "adapter", "adaptor", "cable", "powerbank", "usb"],
  ["bag", "backpack", "bagpack", "handbag", "purse", "wallet", "suitcase", "luggage", "trolley"],
  ["tea", "chai", "coffee", "kofi"],
  ["rice", "chawal", "atta", "flour", "dal", "pulses", "lentil"],
  ["book", "kitab", "novel", "notes", "ebook", "pustak"],
  ["course", "class", "tutorial", "training", "kaksha"],
  ["bed", "bedsheet", "chadar", "pillow", "mattress", "blanket", "razai"],
  ["toy", "khilona", "khilone", "doll", "game", "puzzle"],
  ["cream", "lotion", "moisturizer", "moisturiser", "skincare", "facewash", "serum"],
  ["perfume", "fragrance", "deodorant", "deo", "attar", "scent"],
  ["camera", "dslr", "webcam", "gopro", "cctv"],
  ["fridge", "refrigerator", "freezer"],
  ["fan", "cooler", "ac", "heater"],
  ["dumbbell", "weight", "gym", "fitness", "barbell", "yoga"],
  ["helmet", "gloves", "bike", "bicycle", "cycle"],
  ["sofa", "chair", "kursi", "table", "desk", "furniture", "almari", "wardrobe"],
  ["pen", "pencil", "notebook", "stationery", "copy", "diary"],
  ["mouse", "keyboard", "monitor", "printer", "router"],
  ["case", "cover", "protector", "screenguard", "tempered"],
];

/** A few Hindi-script words that shoppers type; mapped to Latin concept words. */
const DEVANAGARI: Record<string, string> = {
  "इयरबड्स": "earbuds", "इयरबड": "earbuds", "ईयरबड्स": "earbuds", "इयरफोन": "earphone", "ईयरफोन": "earphone", "हेडफोन": "headphone", "हेडफ़ोन": "headphone",
  "फोन": "phone", "फ़ोन": "phone", "मोबाइल": "mobile", "स्मार्टफोन": "smartphone", "आईफोन": "iphone", "लैपटॉप": "laptop", "टीवी": "tv", "घड़ी": "watch",
  "जूते": "shoes", "जूता": "shoes", "चप्पल": "chappal", "कुर्ता": "kurta", "शर्ट": "shirt", "बैग": "bag", "किताब": "book", "चाय": "tea", "कॉफी": "coffee", "स्पीकर": "speaker", "चार्जर": "charger",
};

const WANTS_CHEAPEST = /cheap|lowest|least expensive|sasta|sasti|sastha|सस्ता|सस्ती|kam daam|kam price|minimum price|min price/i;
const WANTS_PRICIEST = /most expensive|costliest|highest price|priciest|mehenga|mehnga|mahenga|महंगा|sabse mahang/i;

/** Plural and simple suffix removal so "earbuds" and "earbud" match each other. */
export function stem(w: string): string {
  let s = w.toLowerCase();
  if (s.length > 4 && s.endsWith("ies")) return s.slice(0, -3) + "y";
  if (s.length > 4 && s.endsWith("es") && /(sh|ch|x|ss)es$/.test(s)) return s.slice(0, -2);
  if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  return s;
}

const conceptIndex = new Map<string, string[]>();
for (const group of CONCEPTS) {
  const stems = group.map(stem);
  for (const s of stems) if (!conceptIndex.has(s)) conceptIndex.set(s, stems);
}

export interface Concept {
  /** Word as the shopper typed it (stemmed). */
  word: string;
  /** Words to look for: the word itself plus synonyms. */
  terms: string[];
  /** True when the word belongs to a known product group. */
  known: boolean;
}

export interface Understood {
  concepts: Concept[];
  wantsCheapest: boolean;
  wantsPriciest: boolean;
}

export function understand(question: string): Understood {
  const lowered = question.toLowerCase();
  const words: string[] = [];
  for (const raw of lowered.split(/[^a-z0-9ऀ-ॿ]+/)) {
    if (!raw) continue;
    const latin = /[ऀ-ॿ]/.test(raw) ? DEVANAGARI[raw] : raw;
    if (!latin) continue;
    words.push(latin);
  }
  // "t shirt" and "t-shirt" are one word.
  const joined: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === "t" && words[i + 1] === "shirt") { joined.push("tshirt"); i++; } else joined.push(words[i]!);
  }
  const seen = new Set<string>();
  const concepts: Concept[] = [];
  for (const w of joined) {
    if (w.length < 2 || STOP.has(w) || /^\d+$/.test(w)) continue;
    const s = stem(w);
    if (s.length < 2 || STOP.has(s) || seen.has(s)) continue;
    seen.add(s);
    const group = conceptIndex.get(s);
    // Two-letter words are only useful when they are a known concept (tv, ac, pc).
    if (s.length < 3 && !group) continue;
    concepts.push({ word: s, terms: group ? Array.from(new Set([s, ...group])) : [s], known: Boolean(group) });
  }
  // Words of one concept group typed together ("earphone headphone") count once.
  const merged: Concept[] = [];
  for (const c of concepts) {
    const same = c.known ? merged.find((m) => m.known && m.terms.includes(c.word)) : undefined;
    if (same) continue;
    merged.push(c);
  }
  return {
    concepts: merged.slice(0, 5),
    wantsCheapest: WANTS_CHEAPEST.test(question),
    wantsPriciest: WANTS_PRICIEST.test(question),
  };
}

export interface Candidate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  parentCategory: string;
  store: string;
  price: number;
  currency?: string;
  stock: number | null;
}

export interface Scored extends Candidate {
  /** Concepts found in the title. */
  titleHits: number;
  /** Concepts found in the title or the category (or its parent). */
  coverage: number;
  /** Concepts whose typed word itself (not a synonym) is in the title. */
  exactHits: number;
  score: number;
  /** Looks like an accessory (case, holder, charger...) rather than the product itself. */
  accessory: boolean;
}

const reCache = new Map<string, RegExp>();
/** Whole-word match (with an optional plural s), so "tea" does not match "Teal" and "bud" does not match "budget". */
export function has(hay: string, term: string): boolean {
  let re = reCache.get(term);
  if (!re) {
    re = new RegExp(`(^|[^a-z0-9])${term.replace(/[^a-z0-9]/g, "")}(s|es)?($|[^a-z0-9])`);
    reCache.set(term, re);
  }
  return re.test(hay);
}

const ACCESSORY = /(^|[^a-z0-9])(case|cases|cover|covers|holder|protector|guard|stand|strap|straps|cable|charger|adapter|mount|skin|pouch|sleeve|refill|spare|replacement|tips|cushion|backpack|bagpack|bag|bags|sticker|stickers|riser|dock|pad|mat)($|[^a-z0-9])/;

export function scoreCandidate(c: Candidate, concepts: Concept[]): Scored {
  const title = c.title.toLowerCase();
  const cat = `${c.category} ${c.parentCategory}`.toLowerCase();
  const desc = (c.description ?? "").toLowerCase();
  let titleHits = 0, coverage = 0, exactHits = 0, score = 0;
  for (const k of concepts) {
    const inTitle = k.terms.some((t) => has(title, t));
    const inCat = k.terms.some((t) => has(cat, t));
    const exact = has(title, k.word);
    if (inTitle) { titleHits++; score += 3; }
    if (exact) { exactHits++; score += 1; }
    if (inCat) score += 2;
    if (inTitle || inCat) coverage++;
    else if (k.terms.some((t) => has(desc, t))) score += 0.5;
  }
  const askedAccessory = concepts.some((k) => k.terms.some((t) => ACCESSORY.test(` ${t} `)));
  const accessory = !askedAccessory && ACCESSORY.test(title);
  if (accessory) score -= 4;
  return { ...c, titleHits, coverage, exactHits, score, accessory };
}

export interface Ranked {
  /** The listings that answer the question, best first (cheapest first when asked). */
  picks: Scored[];
  /** "exact": every asked word is in the titles. "close": only some. "category": matched through category. "none". */
  quality: "exact" | "close" | "category" | "none";
  /** Typed words that no product title or category contains (not even as a synonym). */
  missing: string[];
  /** Number of listings that matched equally well. */
  matched: number;
}

export function rank(cands: Candidate[], u: Understood, limit = 6): Ranked {
  const { concepts } = u;
  if (concepts.length === 0) return { picks: [], quality: "none", missing: [], matched: 0 };
  const scored = cands.map((c) => scoreCandidate(c, concepts));
  const maxTitle = Math.max(0, ...scored.map((s) => s.titleHits));
  const maxCover = Math.max(0, ...scored.map((s) => s.coverage));
  let pool: Scored[];
  let quality: Ranked["quality"];
  if (maxTitle > 0 && maxTitle >= Math.min(maxCover, concepts.length)) {
    pool = scored.filter((s) => s.titleHits === maxTitle);
    quality = maxTitle === concepts.length ? "exact" : "close";
  } else if (maxCover > 0) {
    pool = scored.filter((s) => s.coverage === maxCover);
    quality = "category";
  } else {
    pool = scored.filter((s) => s.score > 0);
    quality = pool.length ? "close" : "none";
  }
  if (pool.some((s) => !s.accessory)) pool = pool.filter((s) => !s.accessory);
  const exactPool = pool.filter((s) => s.exactHits > 0);
  // Listings named exactly as the shopper typed come before ones matched only through a synonym,
  // unless the shopper asked for the cheapest, where every kind of match competes on price.
  const byScore = (a: Scored, b: Scored) => b.score - a.score || a.price - b.price;
  let picks: Scored[];
  if (u.wantsCheapest) picks = [...pool].sort((a, b) => a.price - b.price || b.score - a.score);
  else if (u.wantsPriciest) picks = [...pool].sort((a, b) => b.price - a.price || b.score - a.score);
  else picks = [...(exactPool.length >= 3 ? exactPool : pool)].sort(byScore);
  const allText = scored.map((s) => `${s.title} ${s.category} ${s.parentCategory}`.toLowerCase()).join("\n");
  const missing = concepts.filter((k) => !k.terms.some((t) => has(allText, t))).map((k) => k.word);
  // A word that is not itself in any title (like "iphone") is also reported when only a synonym matched.
  const absent = concepts.filter((k) => !scored.some((s) => has(s.title.toLowerCase(), k.word) || has(`${s.category} ${s.parentCategory}`.toLowerCase(), k.word))).map((k) => k.word);
  return { picks: picks.slice(0, limit), quality, missing: Array.from(new Set([...missing, ...absent.filter((w) => !missing.includes(w) && quality !== "exact")])), matched: pool.length };
}

/** True when the text has Devanagari letters. */
export const hasDevanagari = (t: string) => /[ऀ-ॿ]/.test(t);
