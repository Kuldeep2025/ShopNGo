import { AVATAR_MAX_SIDE, MAX_AVATAR_BYTES } from "./catalog";

function dataUrlBytes(url: string) {
  const b64 = url.slice(url.indexOf(",") + 1);
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
}

/**
 * Reads an image file in the browser, scales it to fit 256 x 256 (square crop from the centre)
 * and compresses it to WebP or JPEG, staying under 150 KB. Throws an Error with a plain message.
 */
export async function resizeToAvatar(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif|bmp)$/.test(file.type)) {
    throw new Error("Please choose a picture file (JPEG, PNG or WebP).");
  }
  if (file.size > 15 * 1024 * 1024) throw new Error("That picture is too big. Please pick one under 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read that picture. Please try another one."));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("Could not read that picture. Please try another one.");
    const out = Math.min(AVATAR_MAX_SIDE, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser cannot resize pictures.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
    for (const type of ["image/webp", "image/jpeg"]) {
      for (const q of [0.85, 0.7, 0.55, 0.4]) {
        const d = canvas.toDataURL(type, q);
        if (d.startsWith(`data:${type}`) && dataUrlBytes(d) <= MAX_AVATAR_BYTES) return d;
      }
    }
    throw new Error("Could not make the picture small enough. Please try another one.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
