/** Free location helpers: distance maths, a simple delivery-time estimate, OpenStreetMap links. */

export type LatLng = { lat: number; lng: number };

export function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough minutes to cover a distance at city speed (about 22 km/h), at least 1. */
export function etaMinutes(km: number, speedKmh = 22): number {
  return Math.max(1, Math.round((km / speedKmh) * 60));
}

export function describeDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} metres`;
  return `${km.toFixed(1)} km`;
}

/** An OpenStreetMap embed centred on a point with a marker. */
export function osmEmbedUrl(point: LatLng, spanDeg = 0.01): string {
  const { lat, lng } = point;
  const bbox = [lng - spanDeg, lat - spanDeg, lng + spanDeg, lat + spanDeg].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function osmLink(point: LatLng, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=${zoom}/${point.lat}/${point.lng}`;
}

type Addr = Record<string, unknown> | null | undefined;

export function addressText(a: Addr): string {
  if (!a) return "";
  return ["line1", "line2", "city", "state", "postalCode", "country"]
    .map((k) => (typeof a[k] === "string" ? (a[k] as string) : ""))
    .filter(Boolean)
    .join(", ");
}

/** Short, non-precise description for job lists (no street). */
export function areaText(a: Addr): string {
  if (!a) return "";
  return ["city", "state", "postalCode"]
    .map((k) => (typeof a[k] === "string" ? (a[k] as string) : ""))
    .filter(Boolean)
    .join(", ");
}

async function nominatim(q: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ShopNGo/1.0 (academic project)", Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    if (!rows?.[0]) return null;
    const lat = Number(rows[0].lat);
    const lng = Number(rows[0].lon);
    return isValidCoord(lat, lng) ? { lat, lng } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Free geocoding with OpenStreetMap Nominatim. Returns null when nothing is found. */
export async function geocodeAddress(a: Addr): Promise<LatLng | null> {
  if (a && isValidCoord(a.lat, a.lng)) return { lat: a.lat as number, lng: a.lng as number };
  const full = addressText(a);
  if (full) {
    const hit = await nominatim(full);
    if (hit) return hit;
  }
  const area = [a?.postalCode, a?.city, a?.country].filter((x) => typeof x === "string" && x).join(", ");
  return area ? nominatim(area) : null;
}
