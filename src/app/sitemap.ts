import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

function base() {
  const a = process.env.APP_URL;
  if (a && !/localhost|127\.0\.0\.1/.test(a)) return a;
  return process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const b = base().replace(/\/$/, "");
  return ["", "/about", "/search", "/categories", "/stores", "/delivery/apply"].map((p) => ({
    url: `${b}${p}`,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.7,
  }));
}
