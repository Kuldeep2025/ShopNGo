import type { MetadataRoute } from "next";

function base() {
  const a = process.env.APP_URL;
  if (a && !/localhost|127\.0\.0\.1/.test(a)) return a;
  return process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/account", "/checkout", "/seller", "/moderator", "/delivery"] }],
    sitemap: `${base().replace(/\/$/, "")}/sitemap.xml`,
  };
}
