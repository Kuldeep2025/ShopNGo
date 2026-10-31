/**
 * ShopNGo service worker – conservative, additive.
 * Caches only static app shell assets (icons, images, manifest).
 * Never caches API routes, pages, or authenticated content.
 */
const CACHE_NAME = "shopngo-static-v1";
const PRECACHE = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-icon-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  // Only same-origin static assets under /images/ and icon files.
  const isStatic =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/images/") ||
      url.pathname.startsWith("/icon-") ||
      url.pathname === "/favicon.ico" ||
      url.pathname === "/apple-touch-icon.png");
  if (!isStatic) return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ??
        fetch(event.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
    )
  );
});
