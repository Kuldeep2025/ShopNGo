/**
 * Writes one small SVG illustration per ShopNGo Mall product into
 * public/images/mall. Files are local, so product images never break because
 * of a third-party site. Safe to run again: unchanged files are left alone.
 *
 *   npm run mall:images
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateMallCatalogue, type MallProduct } from "../src/lib/mall/generate";

const OUT_DIR = path.join(process.cwd(), "public", "images", "mall");
const ICON_DIR = path.join(process.cwd(), "node_modules", "lucide-react", "dist", "esm", "icons");

const COLOUR_WORDS: [RegExp, string][] = [
  [/navy/i, "#1f3a73"], [/charcoal|graphite/i, "#3d4450"], [/olive/i, "#6b7a2e"], [/maroon|berry/i, "#8a1c3a"],
  [/mustard/i, "#c99a12"], [/teal/i, "#12828a"], [/black/i, "#2b2b33"], [/off white|white|pearl/i, "#9aa3b2"],
  [/sky|blue|ocean/i, "#2f78c4"], [/brick|red|coral/i, "#b8432f"], [/green/i, "#2f8a4b"], [/pink|rose/i, "#c2467a"],
  [/purple|plum/i, "#6d3fa3"], [/orange/i, "#d9701c"], [/brown|tan|walnut|oak|teak|wenge/i, "#8a5a3a"],
  [/grey|gray|silver/i, "#667085"], [/gold|beige|nude/i, "#a8873c"],
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function accentFor(p: MallProduct): string {
  for (const [re, colour] of COLOUR_WORDS) if (re.test(p.variant)) return colour;
  return `hsl(${hash(p.parentName) % 360} 55% 38%)`;
}

const iconCache = new Map<string, string>();
function iconMarkup(name: string): string {
  const cached = iconCache.get(name);
  if (cached) return cached;
  const kebab = name.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();
  const file = [kebab, "package"].map((k) => path.join(ICON_DIR, `${k}.js`)).find(existsSync)!;
  const src = readFileSync(file, "utf8");
  const start = src.indexOf(", [", src.indexOf("createLucideIcon(")) + 2;
  const end = src.lastIndexOf("]);");
  const nodes = new Function(`return ${src.slice(start, end + 1)}`)() as [string, Record<string, string>][];
  const markup = nodes
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`)
    .join("");
  iconCache.set(name, markup);
  return markup;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrap(text: string, max: number, lines: number): string[] {
  const words = text.split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max && line) {
      out.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  }
  if (line) out.push(line);
  return out.slice(0, lines);
}

export function renderSvg(p: MallProduct): string {
  const accent = accentFor(p);
  const noun = p.title.replace(`${p.brand} ${p.series} `, "").replace(` - ${p.variant}`, "");
  const nameLines = wrap(noun, 24, 2);
  const tspans = nameLines.map((l, i) => `<text x="300" y="${468 + i * 34}" text-anchor="middle" font-size="30" font-weight="700" fill="#1b1f2a">${esc(l)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-labelledby="t d" font-family="Helvetica, Arial, sans-serif">
<title id="t">${esc(p.title)}</title><desc id="d">${esc(p.imageAlt)}</desc>
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity="0.16"/><stop offset="1" stop-color="${accent}" stop-opacity="0.04"/></linearGradient></defs>
<rect width="600" height="600" fill="#f7f8fb"/><rect width="600" height="600" fill="url(#g)"/>
<circle cx="300" cy="215" r="150" fill="#ffffff" stroke="${accent}" stroke-opacity="0.35" stroke-width="3"/>
<g transform="translate(204 119) scale(8)" fill="none" stroke="${accent}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${iconMarkup(p.icon)}</g>
<text x="300" y="410" text-anchor="middle" font-size="22" letter-spacing="3" font-weight="700" fill="${accent}">${esc(p.brand.toUpperCase())}</text>
${tspans}
<text x="300" y="${468 + nameLines.length * 34 + 8}" text-anchor="middle" font-size="22" fill="#4a5163">${esc(p.variant)}</text>
<text x="300" y="578" text-anchor="middle" font-size="16" fill="#7a8196">${esc(p.categoryName)} - ShopNGo Mall</text>
</svg>
`;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const products = generateMallCatalogue();
  const wanted = new Set(products.map((p) => `${path.basename(p.imagePath)}`));
  let written = 0;
  for (const p of products) {
    const file = path.join(OUT_DIR, path.basename(p.imagePath));
    const svg = renderSvg(p);
    if (!existsSync(file) || readFileSync(file, "utf8") !== svg) {
      writeFileSync(file, svg);
      written++;
    }
  }
  for (const f of readdirSync(OUT_DIR)) if (f.endsWith(".svg") && !wanted.has(f)) unlinkSync(path.join(OUT_DIR, f));
  console.log(`Mall images ready: ${products.length} files (${written} written).`);
}

main();
