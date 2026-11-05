/** Built-in AI avatars. The id is what gets stored; the name is read out by screen readers. */
export const AI_AVATARS = [
  { id: "robot", name: "Friendly robot", bg: "#0f766e", fg: "#ffffff" },
  { id: "spark", name: "Spark", bg: "#b45309", fg: "#ffffff" },
  { id: "owl", name: "Wise owl", bg: "#4338ca", fg: "#ffffff" },
  { id: "cart", name: "Cart buddy", bg: "#be123c", fg: "#ffffff" },
  { id: "planet", name: "Planet", bg: "#1d4ed8", fg: "#ffffff" },
  { id: "leaf", name: "Leaf", bg: "#15803d", fg: "#ffffff" },
  { id: "star", name: "Star", bg: "#7e22ce", fg: "#ffffff" },
  { id: "smile", name: "Smile", bg: "#0e7490", fg: "#ffffff" },
] as const;

export type AiAvatarId = (typeof AI_AVATARS)[number]["id"];
export const DEFAULT_AI_AVATAR: AiAvatarId = "robot";

export function isAiAvatarId(v: unknown): v is AiAvatarId {
  return AI_AVATARS.some((a) => a.id === v);
}

export function aiAvatarName(id: unknown): string {
  return AI_AVATARS.find((a) => a.id === id)?.name ?? "Friendly robot";
}

export const MAX_AVATAR_BYTES = 150 * 1024;
export const AVATAR_MAX_SIDE = 256;
