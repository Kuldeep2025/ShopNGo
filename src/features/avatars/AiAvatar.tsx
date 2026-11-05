import { AI_AVATARS, aiAvatarName, DEFAULT_AI_AVATAR, type AiAvatarId } from "./catalog";

function Glyph({ id }: { id: AiAvatarId }) {
  const common = { fill: "none", stroke: "#fff", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "robot":
      return (
        <g {...common}>
          <rect x="10" y="14" width="20" height="16" rx="4" />
          <path d="M20 14V9M17 9h6" />
          <circle cx="15.5" cy="21" r="1.6" fill="#fff" />
          <circle cx="24.5" cy="21" r="1.6" fill="#fff" />
          <path d="M16 26h8" />
        </g>
      );
    case "spark":
      return <path d="M20 8l3.2 8.8L32 20l-8.8 3.2L20 32l-3.2-8.8L8 20l8.8-3.2z" fill="#fff" stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />;
    case "owl":
      return (
        <g {...common}>
          <path d="M11 11l4 3h10l4-3v12a9 9 0 01-18 0z" />
          <circle cx="16" cy="19" r="3" />
          <circle cx="24" cy="19" r="3" />
          <path d="M19 24l1 2 1-2z" fill="#fff" />
        </g>
      );
    case "cart":
      return (
        <g {...common}>
          <path d="M8 10h4l3 13h12l3-9H13" />
          <circle cx="16" cy="29" r="1.8" fill="#fff" />
          <circle cx="26" cy="29" r="1.8" fill="#fff" />
        </g>
      );
    case "planet":
      return (
        <g {...common}>
          <circle cx="20" cy="20" r="7" />
          <path d="M7 25c-2-5 6-12 16-14M33 15c2 5-6 12-16 14" />
        </g>
      );
    case "leaf":
      return (
        <g {...common}>
          <path d="M10 30C10 16 18 9 31 9c0 13-7 21-21 21z" />
          <path d="M10 30c5-7 9-11 15-14" />
        </g>
      );
    case "star":
      return <path d="M20 8l3.6 8 8.4 1-6.2 5.8 1.7 8.4L20 27l-7.5 4.2 1.7-8.4L8 17l8.4-1z" fill="#fff" stroke="#fff" strokeWidth={1.2} strokeLinejoin="round" />;
    case "smile":
      return (
        <g {...common}>
          <circle cx="20" cy="20" r="11" />
          <circle cx="16" cy="17" r="1.4" fill="#fff" />
          <circle cx="24" cy="17" r="1.4" fill="#fff" />
          <path d="M14.5 23c3 4 8 4 11 0" />
        </g>
      );
  }
}

/** Round AI avatar. Decorative by default (the message label already says "AI"); pass labelled to name it. */
export function AiAvatar({ id, size = 36, labelled = false }: { id?: string | null; size?: number; labelled?: boolean }) {
  const av = AI_AVATARS.find((a) => a.id === id) ?? AI_AVATARS.find((a) => a.id === DEFAULT_AI_AVATAR)!;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={labelled ? "img" : undefined}
      aria-label={labelled ? aiAvatarName(av.id) : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      className="shrink-0"
    >
      <circle cx="20" cy="20" r="20" fill={av.bg} />
      <Glyph id={av.id} />
    </svg>
  );
}
