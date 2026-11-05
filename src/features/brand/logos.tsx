import type { ReactNode } from "react";

/**
 * Six ShopNGo logo marks. Every mark is a decorative, scalable SVG on the
 * same rounded teal tile, drawn with the brand teal, white and a light teal
 * accent. The accessible name always comes from the visible "ShopNGo" text
 * next to the mark, so the SVGs are aria-hidden.
 */
const TILE = "#0f766e";
const TILE_GLOW = "#14b8a6";
const ACCENT = "#99f6e4";
const WHITE = "#ffffff";

export const LOGO_DESIGNS: ReadonlyArray<{ name: string; description: string }> = [
  { name: "Spark bag", description: "a white shopping bag with a small four-point spark in the middle" },
  { name: "Pin and cart", description: "a white location pin with a little shopping cart inside it" },
  { name: "Delivery scooter", description: "a delivery scooter with a parcel box on the back and speed lines behind it" },
  { name: "Store front", description: "a shop front with a scalloped awning, a window and a door" },
  { name: "Smart cart", description: "a shopping cart with a large AI sparkle and a small one floating above it" },
  { name: "Review star", description: "a speech bubble holding a five-point review star" },
];

const glyphs: ReactNode[] = [
  // 1. Spark bag
  <g key="bag">
    <path d="M13.5 15.5h13l1.6 14a2 2 0 0 1-2 2.2H13.9a2 2 0 0 1-2-2.2z" fill={WHITE} />
    <path d="M15.8 15.5v-2.4a4.2 4.2 0 0 1 8.4 0v2.4" fill="none" stroke={WHITE} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M20 19.2l1.5 3.2 3.2 1.5-3.2 1.5-1.5 3.2-1.5-3.2-3.2-1.5 3.2-1.5z" fill={TILE} />
  </g>,
  // 2. Pin and cart
  <g key="pin">
    <path d="M20 34.5C20 34.5 9.5 25 9.5 16.8a10.5 10.5 0 0 1 21 0C30.5 25 20 34.5 20 34.5z" fill={WHITE} />
    <path d="M14.2 12.4h2l1.7 7h6.8l1.4-4.9h-9.3" fill="none" stroke={TILE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="18.7" cy="22.2" r="1.2" fill={TILE} />
    <circle cx="24.2" cy="22.2" r="1.2" fill={TILE} />
  </g>,
  // 3. Delivery scooter
  <g key="scooter">
    <rect x="9" y="11.5" width="9.5" height="7.5" rx="1.6" fill={ACCENT} />
    <circle cx="12" cy="28.5" r="3.8" fill="none" stroke={WHITE} strokeWidth="2.2" />
    <circle cx="29" cy="28.5" r="3.8" fill="none" stroke={WHITE} strokeWidth="2.2" />
    <path d="M12 28.5h4.5l2.3-8.5h7l3.2 8.5" fill="none" stroke={WHITE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M25.8 20l-1.2-7.2h4" fill="none" stroke={WHITE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 21.5h3M4.5 25.5h3.2" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" />
  </g>,
  // 4. Store front
  <g key="store">
    <path d="M10.5 8.5h19l3.5 10.5H7z" fill={WHITE} />
    <circle cx="10.25" cy="19" r="3.25" fill={WHITE} />
    <circle cx="16.75" cy="19" r="3.25" fill={WHITE} />
    <circle cx="23.25" cy="19" r="3.25" fill={WHITE} />
    <circle cx="29.75" cy="19" r="3.25" fill={WHITE} />
    <path d="M16.6 8.5l-.5 10.5M23.4 8.5l.5 10.5" stroke={TILE} strokeOpacity="0.45" strokeWidth="1.3" />
    <path d="M10 22.8V32h20V22.8" fill="none" stroke={WHITE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="17.2" y="25.5" width="5.6" height="6.5" rx="0.8" fill={ACCENT} />
  </g>,
  // 5. Smart cart with AI sparkle
  <g key="cart">
    <path d="M6.5 14h3.6l3 13.5h13.6l2.8-10.2H11.4" fill="none" stroke={WHITE} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="15.8" cy="31.6" r="2.1" fill={WHITE} />
    <circle cx="25.2" cy="31.6" r="2.1" fill={WHITE} />
    <path d="M27 4.2l1.7 3.9 3.9 1.7-3.9 1.7L27 15.4l-1.7-3.9-3.9-1.7 3.9-1.7z" fill={ACCENT} />
    <path d="M34 11.6l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill={WHITE} />
  </g>,
  // 6. Review star in a speech bubble
  <g key="review">
    <path d="M10.5 8h19a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H21.2L15 32v-6h-4.5a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" fill={WHITE} />
    <path d="M20 8.9l1.5 4.1 5.9.1-3.8 2.7 1.5 5-4.1-2.4-4.1 2.4 1.5-5-3.8-2.7 5.9-.1z" fill={TILE} transform="translate(0 1.4)" />
  </g>,
];

export function LogoMark({
  variant = 0,
  className,
}: {
  variant?: number;
  className?: string;
}) {
  const index = ((variant % glyphs.length) + glyphs.length) % glyphs.length;
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-logo-variant={index}
    >
      <rect width="40" height="40" rx="10" fill={TILE} />
      <path d="M0 10a10 10 0 0 1 10-10h20a10 10 0 0 1 10 10v6C28 12 12 12 0 16z" fill={TILE_GLOW} fillOpacity="0.28" />
      {glyphs[index]}
    </svg>
  );
}
