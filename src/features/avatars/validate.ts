import { MAX_AVATAR_BYTES } from "./catalog";

export type AvatarCheck = { ok: true; bytes: number } | { ok: false; error: string };

const DATA_URL = /^data:image\/(jpeg|webp|png);base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * Server-side check of an uploaded picture. Never trust the browser:
 * type, size and the real file signature are all verified here.
 */
export function validateAvatarDataUrl(value: unknown): AvatarCheck {
  if (typeof value !== "string") return { ok: false, error: "Picture is missing." };
  // Cheap length guard before any decoding (base64 is about 4/3 of the bytes).
  if (value.length > Math.ceil((MAX_AVATAR_BYTES * 4) / 3) + 64) {
    return { ok: false, error: "Picture is too large. Please use one under 150 KB." };
  }
  const m = DATA_URL.exec(value);
  if (!m) return { ok: false, error: "Only JPEG, WebP or PNG pictures are allowed." };
  const buf = Buffer.from(m[2]!, "base64");
  if (buf.length === 0 || buf.length > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Picture is too large. Please use one under 150 KB." };
  }
  const type = m[1];
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  const okSig = (type === "jpeg" && isJpeg) || (type === "png" && isPng) || (type === "webp" && isWebp);
  if (!okSig) return { ok: false, error: "That file is not a valid picture." };
  return { ok: true, bytes: buf.length };
}
