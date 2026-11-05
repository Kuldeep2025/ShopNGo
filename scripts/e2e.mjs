// End-to-end API check against a running local app.
// Needs FIREBASE_AUTH_EMULATOR_HOST set on the server so unsigned test tokens are accepted.
// Usage: BASE=http://localhost:3000 node scripts/e2e.mjs
const BASE = process.env.BASE ?? "http://localhost:3000";
const PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "demo-shopngo";
const RUN = Date.now().toString(36);

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function token(name, email, uid = `${name}-${RUN}`) {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, auth_time: now, user_id: uid,
    sub: uid, iat: now, exp: now + 3600, email, email_verified: true, name: `Test ${name}`,
    firebase: { identities: { email: [email] }, sign_in_provider: "password" },
  })}.`;
}

let pass = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name} ${detail}`); }
}
async function call(method, path, { tok, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text, headers: res.headers };
}

const cust = token("customer", `customer-${RUN}@example.test`);
const sell = token("seller", `seller-${RUN}@example.test`);
const mod = token("moderator", `moderator-${RUN}@example.test`);
const admin = token("admin", "admin@example.test", "admin-fixed");
const buyer2 = token("buyer2", `buyer2-${RUN}@example.test`);

// ---- public pages and PWA
for (const p of ["/", "/search", "/categories", "/cart", "/auth/sign-in", "/account", "/checkout", "/orders", "/insights", "/forbidden", "/seller/apply", "/seller/listings", "/seller/orders", "/moderator/applications", "/moderator/listings", "/offline.html", "/manifest.json", "/sw.js", "/icon-192.png", "/icon-512.png"]) {
  const r = await call("GET", p);
  check(`page ${p} responds 200`, r.status === 200, String(r.status));
}
const man = (await call("GET", "/manifest.json")).json;
check("manifest has name, start_url, icons", !!(man?.name && man?.start_url && man?.icons?.length >= 2));
const sw = await call("GET", "/sw.js");
check("service worker is javascript with no long cache", /javascript/.test(sw.headers.get("content-type") ?? "") && /no-cache|max-age=0|no-store/.test(sw.headers.get("cache-control") ?? ""), sw.headers.get("cache-control") ?? "");
check("health reports database ok", (await call("GET", "/health")).json?.checks?.database === "ok");

// ---- categories, search, pagination
const cats = await call("GET", "/api/categories");
check("categories list", cats.status === 200 && JSON.stringify(cats.json).split('"slug"').length > 50);
const first = await call("GET", "/api/search?limit=24");
check("search default returns 24 with total >= 2230", first.status === 200 && first.json.listings?.length === 24 && first.json.total >= 2230, JSON.stringify(first.json).slice(0, 200));
const key = "listings";
for (const sort of ["newest", "price_asc", "price_desc", "title"]) {
  const seen = new Set();
  let cursor = null, pages = 0, ok = true;
  while (pages < 4) {
    const r = await call("GET", `/api/search?limit=50&sort=${sort}${cursor ? `&cursor=${cursor}` : ""}`);
    if (r.status !== 200) { ok = r.status === 400 && pages === 0 ? true : false; break; }
    for (const it of r.json[key]) { if (seen.has(it.id)) ok = false; seen.add(it.id); }
    pages++;
    cursor = r.json.nextCursor;
    if (!cursor) break;
  }
  check(`pagination sort=${sort} has no duplicates across pages`, ok && seen.size > 0, `seen ${seen.size}`);
}
// walk entire catalogue
{
  const seen = new Set();
  let cursor = null;
  for (let i = 0; i < 60; i++) {
    const r = await call("GET", `/api/search?limit=50&sort=newest${cursor ? `&cursor=${cursor}` : ""}`);
    for (const it of r.json[key]) seen.add(it.id);
    cursor = r.json.nextCursor;
    if (!cursor) break;
  }
  check("walking all pages reaches every product (>= 2230 unique)", seen.size >= 2230, String(seen.size));
}
const price = await call("GET", "/api/search?minPrice=1000&maxPrice=2000&sort=price_asc&limit=30");
check("price filter respected", price.status === 200 && price.json[key].every((x) => Number(x.price) >= 1000 && Number(x.price) <= 2000), JSON.stringify(price.json).slice(0, 200));
const q = await call("GET", "/api/search?q=laptop&limit=10");
check("text search finds results", q.status === 200 && q.json[key].length > 0);
const catSearch = await call("GET", "/api/search?category=home-living&limit=10");
check("parent category filter returns results", catSearch.status === 200 && catSearch.json[key].length > 0 && catSearch.json.total > 50);
const none = await call("GET", "/api/search?q=zzzzqqqxxnothing");
check("empty search returns no results gracefully", none.status === 200 && none.json[key].length === 0);
const badCur = await call("GET", "/api/search?cursor=garbage");
check("bad cursor does not crash", badCur.status < 500, String(badCur.status));

// pick physical in-stock products
const all50 = (await call("GET", "/api/search?limit=50&sort=price_asc&minPrice=500")).json[key];
const prod = all50.find((p) => p.slug && (p.stock === undefined || p.stock > 5)) ?? all50[0];
check("search result has media with url and alt", !!prod.media?.[0]?.url && !!prod.media?.[0]?.alt, JSON.stringify(prod.media));

// product page
const pdp = await call("GET", `/products/${prod.slug}`);
check("product page renders", pdp.status === 200 && pdp.text.includes(prod.title.slice(0, 20).replace(/&/g, "&amp;")), String(pdp.status));
const pApi = await call("GET", `/api/products/${prod.slug}`);
check("product api", pApi.status === 200);
const storeSlug = prod.store?.slug;
if (storeSlug) {
  check("store page", (await call("GET", `/stores/${storeSlug}`)).status === 200);
  check("store api", (await call("GET", `/api/stores/${storeSlug}`)).status === 200);
}
check("unknown product 404", (await call("GET", "/api/products/does-not-exist-xyz")).status === 404);

// ---- auth required
for (const p of ["/api/cart", "/api/orders", "/api/profile", "/api/addresses", "/api/auth/me"]) {
  check(`unauthenticated ${p} gives 401`, (await call("GET", p)).status === 401);
}
check("forged token rejected", (await call("GET", "/api/auth/me", { tok: "abc.def.ghi" })).status === 401);
check("customer cannot reach moderator api", (await call("GET", "/api/moderator/applications", { tok: cust })).status === 403);
check("customer cannot reach analytics", [401, 403].includes((await call("GET", "/api/analytics/insights", { tok: cust })).status));
check("customer cannot reach seller api", (await call("GET", "/api/seller/listings", { tok: cust })).status === 403);

// ---- signup / profile / address
const sess = await call("GET", "/api/auth/session", { tok: cust });
check("first sign-in creates account", sess.status === 200 && sess.json?.user?.roles?.includes("CUSTOMER"), JSON.stringify(sess.json));
const me = await call("GET", "/api/auth/me", { tok: cust });
check("auth/me returns customer role", me.status === 200 && JSON.stringify(me.json).includes("CUSTOMER"));
const pr = await call("PATCH", "/api/profile", { tok: cust, body: { displayName: "Test Customer", phone: "+919876543210" } });
check("profile update", pr.status === 200, JSON.stringify(pr.json));
const prg = await call("GET", "/api/profile", { tok: cust });
check("profile read shows update", prg.status === 200 && JSON.stringify(prg.json).includes("Test Customer"));
const badAddr = await call("POST", "/api/addresses", { tok: cust, body: { line1: "" } });
check("invalid address rejected", badAddr.status === 400);
const addr = await call("POST", "/api/addresses", { tok: cust, body: { label: "Home", line1: "12 Test Street", city: "Mohali", state: "Punjab", postalCode: "140307", country: "IN", isDefault: true } });
check("address created", addr.status === 201 || addr.status === 200, JSON.stringify(addr.json));
const addressId = addr.json?.address?.id;
check("address list", (await call("GET", "/api/addresses", { tok: cust })).json?.addresses?.length >= 1);

// ---- cart
const empty = await call("GET", "/api/cart", { tok: cust });
check("empty cart", empty.status === 200);
const phys = all50.filter((p) => p.productType === "PHYSICAL" || !p.productType).slice(0, 3);
const add1 = await call("POST", "/api/cart/items", { tok: cust, body: { listingId: phys[0].id, quantity: 2 } });
check("add to cart", add1.status < 300, JSON.stringify(add1.json));
const add2 = await call("POST", "/api/cart/items", { tok: cust, body: { listingId: phys[1].id, quantity: 1 } });
check("add second product", add2.status < 300);
check("add zero quantity rejected", (await call("POST", "/api/cart/items", { tok: cust, body: { listingId: phys[0].id, quantity: 0 } })).status === 400);
const over = await call("POST", "/api/cart/items", { tok: cust, body: { listingId: phys[0].id, quantity: 99 } });
check("more than stock rejected", over.status === 400 || (phys[0].stock ?? 100) >= 99, String(over.status));
const cartNow = await call("GET", "/api/cart", { tok: cust });
const items = cartNow.json?.cart?.items ?? cartNow.json?.items ?? [];
check("cart shows 2 lines", items.length === 2, JSON.stringify(cartNow.json).slice(0, 300));
const quote = await call("POST", "/api/cart/quote", { tok: cust });
check("cart quote", quote.status === 200, JSON.stringify(quote.json).slice(0, 200));
const itemId = items[1]?.id;
if (itemId) {
  const upd = await call("PATCH", "/api/cart/items", { tok: cust, body: { listingId: items[1].listingId, quantity: 3 } });
  check("update cart quantity", upd.status < 300, JSON.stringify(upd.json));
  const del = await call("PATCH", "/api/cart/items", { tok: cust, body: { listingId: items[1].listingId, quantity: 0 } });
  check("remove cart line (quantity 0)", del.status < 300, JSON.stringify(del.json));
}
// out of stock product
let oosItem = null;
for (let c = null, i = 0; i < 50 && !oosItem; i++) {
  const r = await call("GET", `/api/search?limit=50${c ? `&cursor=${c}` : ""}`);
  oosItem = r.json[key].find((p) => p.inStock === false);
  c = r.json.nextCursor; if (!c) break;
}
if (oosItem) {
  const r = await call("POST", "/api/cart/items", { tok: cust, body: { listingId: oosItem.id, quantity: 1 } });
  check("out-of-stock product cannot be added", r.status === 400, String(r.status));
} else check("found an out-of-stock product to test", false);

// ---- checkout
const noKey = await call("POST", "/api/orders", { tok: cust, body: { addressId } });
check("checkout requires idempotency key", noKey.status === 400);
const idem = `e2e-${RUN}-1`;
const ord = await call("POST", "/api/orders", { tok: cust, body: { addressId }, headers: { "idempotency-key": idem } });
check("order created", ord.status === 201, JSON.stringify(ord.json).slice(0, 300));
const orderId = ord.json?.order?.id;
const replay = await call("POST", "/api/orders", { tok: cust, body: { addressId }, headers: { "idempotency-key": idem } });
check("repeat checkout does not duplicate order", replay.json?.order?.id === orderId && replay.json?.replayed === true);
check("cart emptied after checkout", ((await call("GET", "/api/cart", { tok: cust })).json?.cart?.items ?? (await call("GET", "/api/cart", { tok: cust })).json?.items ?? []).length === 0);
const empt = await call("POST", "/api/orders", { tok: cust, body: { addressId }, headers: { "idempotency-key": `e2e-${RUN}-2` } });
check("checkout with empty cart rejected", empt.status === 400);
check("order starts unpaid", ord.json?.order?.status === "PENDING_PAYMENT");
// payment
check("payment for someone else's order is 404", (await call("POST", "/api/payments/mock", { tok: buyer2, body: { orderId } })).status === 404);
const fail = await call("POST", "/api/payments/mock", { tok: cust, body: { orderId, outcome: "failure" } });
check("failed demo payment leaves order unpaid", fail.status === 200 && fail.json.order.status === "PENDING_PAYMENT");
const paid = await call("POST", "/api/payments/mock", { tok: cust, body: { orderId, outcome: "success" } });
check("demo payment succeeds", paid.status === 200 && paid.json.order.status === "PAID", JSON.stringify(paid.json).slice(0, 200));
const paid2 = await call("POST", "/api/payments/mock", { tok: cust, body: { orderId, outcome: "success" } });
check("paying twice is harmless", paid2.status === 200 && paid2.json.replayed === true);
const ol = await call("GET", "/api/orders", { tok: cust });
check("orders list contains the order", ol.json?.orders?.some((o) => o.id === orderId));
const od = await call("GET", `/api/orders/${orderId}`, { tok: cust });
check("order detail", od.status === 200);
check("other user cannot read the order", (await call("GET", `/api/orders/${orderId}`, { tok: buyer2 })).status === 404);
check("orders page renders", (await call("GET", `/orders`)).status === 200);

// stock decremented
const after = await call("GET", `/api/products/${phys[0].slug}`);
const stockAfter = after.json?.product?.stock ?? after.json?.stock;
if (phys[0].stock !== undefined && stockAfter !== undefined) check("stock reduced after purchase", stockAfter === phys[0].stock - 2, `${phys[0].stock} -> ${stockAfter}`);

// ---- cancel a second order
await call("POST", "/api/cart/items", { tok: cust, body: { listingId: phys[2].id, quantity: 1 } });
const o2 = await call("POST", "/api/orders", { tok: cust, body: { addressId }, headers: { "idempotency-key": `e2e-${RUN}-3` } });
const o2id = o2.json?.order?.id;
check("second order created", o2.status === 201);
const canc = await call("PATCH", `/api/orders/${o2id}`, { tok: cust, body: { action: "cancel", reason: "changed my mind" } });
check("order cancelled", canc.status === 200 && JSON.stringify(canc.json).includes("CANCELLED"), JSON.stringify(canc.json).slice(0, 200));
const stock3 = (await call("GET", `/api/products/${phys[2].slug}`)).json;
const s3 = stock3?.product?.stock ?? stock3?.stock;
if (phys[2].stock !== undefined && s3 !== undefined) check("stock restored after cancel", s3 === phys[2].stock, `${phys[2].stock} -> ${s3}`);
check("cancelled order cannot be cancelled again", (await call("PATCH", `/api/orders/${o2id}`, { tok: cust, body: { action: "cancel" } })).status >= 400);

// ---- reviews
const itemRow = od.json?.order?.items?.[0] ?? od.json?.items?.[0];
const rv = await call("POST", "/api/reviews", { tok: cust, body: { listingId: itemRow.listingId, orderItemId: itemRow.id, rating: 5, title: "Great", body: "Works well, arrived on time." } });
check("verified purchase review accepted", rv.status === 201 || rv.status === 200, JSON.stringify(rv.json));
const rv2 = await call("POST", "/api/reviews", { tok: cust, body: { listingId: itemRow.listingId, orderItemId: itemRow.id, rating: 4 } });
check("second review for same purchase rejected", rv2.status === 409 || rv2.status === 400, String(rv2.status));
const rvOther = await call("POST", "/api/reviews", { tok: buyer2, body: { listingId: itemRow.listingId, orderItemId: itemRow.id, rating: 5 } });
check("review without purchase rejected", rvOther.status === 403);
const rvList = await call("GET", `/api/reviews?listingId=${itemRow.listingId}`);
check("reviews listed", rvList.status === 200 && JSON.stringify(rvList.json).includes("Great"));

// ---- seller application -> moderator -> listing -> fulfilment
const sapp0 = await call("POST", "/api/seller/application", { tok: sell, body: { businessName: "E2E Gadgets", description: "Testing store", action: "submit" } });
check("seller application submitted", sapp0.status < 300, JSON.stringify(sapp0.json));
await call("GET", "/api/auth/session", { tok: mod });
// promote moderator through the admin account
const adminSess = await call("GET", "/api/auth/session", { tok: admin });
check("bootstrap admin gets admin role", JSON.stringify(adminSess.json).includes("ADMIN"), JSON.stringify(adminSess.json));
const apps = await call("GET", "/api/moderator/applications", { tok: admin });
check("admin lists applications", apps.status === 200);
const appRow = (apps.json.applications ?? []).find((a) => a.user?.email === `seller-${RUN}@example.test`);
check("application is visible to moderator", !!appRow, JSON.stringify(apps.json).slice(0, 300));
const bad = await call("PATCH", "/api/moderator/applications", { tok: admin, body: { applicationId: appRow?.id, decision: "APPROVED", reason: "x" } });
check("decision without proper reason rejected", bad.status === 400);
const appr = await call("PATCH", "/api/moderator/applications", { tok: admin, body: { applicationId: appRow?.id, decision: "APPROVED", reason: "Documents look fine" } });
check("application approved", appr.status === 200, JSON.stringify(appr.json).slice(0, 200));
const sellMe = await call("GET", "/api/auth/me", { tok: sell });
check("applicant now has seller role", JSON.stringify(sellMe.json).includes("SELLER"), JSON.stringify(sellMe.json));
const nl = await call("POST", "/api/seller/listings", { tok: sell, body: { title: `E2E Widget ${RUN}`, description: "A widget made for testing.", productType: "PHYSICAL", price: "499.00", stock: 10, submit: true } });
check("seller creates listing", nl.status === 201, JSON.stringify(nl.json).slice(0, 300));
const nlId = nl.json?.listing?.id;
const hidden = await call("GET", `/api/search?q=E2E+Widget+${RUN}`);
check("unapproved listing is not public", hidden.json[key].length === 0);
check("seller sees own listings", JSON.stringify((await call("GET", "/api/seller/listings", { tok: sell })).json).includes(`E2E Widget ${RUN}`));
const ml = await call("GET", "/api/moderator/listings", { tok: admin });
check("moderator sees review queue", ml.status === 200 && JSON.stringify(ml.json).includes(`E2E Widget ${RUN}`));
const mapp = await call("PATCH", "/api/moderator/listings", { tok: admin, body: { listingId: nlId, decision: "APPROVED", reason: "Looks good" } });
check("moderator approves listing", mapp.status === 200, JSON.stringify(mapp.json).slice(0, 200));
const vis = await call("GET", `/api/search?q=E2E+Widget+${RUN}`);
check("approved listing becomes public", vis.json[key].length === 1);
// buy it from the seller
await call("POST", "/api/cart/items", { tok: buyer2, body: { listingId: nlId, quantity: 1 } });
await call("GET", "/api/auth/session", { tok: buyer2 });
const a2 = await call("POST", "/api/addresses", { tok: buyer2, body: { line1: "5 Other Road", city: "Chandigarh", postalCode: "160017", country: "IN", isDefault: true } });
await call("POST", "/api/cart/items", { tok: buyer2, body: { listingId: nlId, quantity: 1 } });
const bo = await call("POST", "/api/orders", { tok: buyer2, body: { addressId: a2.json?.address?.id }, headers: { "idempotency-key": `e2e-${RUN}-b2` } });
check("buyer orders seller item", bo.status === 201, JSON.stringify(bo.json).slice(0, 200));
await call("POST", "/api/payments/mock", { tok: buyer2, body: { orderId: bo.json?.order?.id } });
const stockOf = async () => ((await call("GET", "/api/seller/listings", { tok: sell })).json.listings ?? []).find((l) => l.id === nlId)?.stock;
check("seller stock drops after a sale", (await stockOf()) === 9, String(await stockOf()));
await call("POST", "/api/cart/items", { tok: buyer2, body: { listingId: nlId, quantity: 2 } });
const bo2 = await call("POST", "/api/orders", { tok: buyer2, body: { addressId: a2.json?.address?.id }, headers: { "idempotency-key": `e2e-${RUN}-b3` } });
check("stock drops after second order", (await stockOf()) === 7, String(await stockOf()));
await call("PATCH", `/api/orders/${bo2.json?.order?.id}`, { tok: buyer2, body: { action: "cancel" } });
check("stock comes back after cancel", (await stockOf()) === 9, String(await stockOf()));
const so = await call("GET", "/api/seller/orders", { tok: sell });
const sor = (so.json.orders ?? []).find((o) => o.orderId === bo.json?.order?.id);
check("seller sees the order", !!sor && sor.status === "PAID", JSON.stringify(so.json).slice(0, 200));
const skip = await call("PATCH", "/api/seller/orders", { tok: sell, body: { sellerOrderId: sor?.id, status: "DELIVERED" } });
check("cannot skip fulfilment steps", skip.status >= 400);
for (const st of ["PROCESSING", "SHIPPED", "DELIVERED"]) {
  const r = await call("PATCH", "/api/seller/orders", { tok: sell, body: { sellerOrderId: sor?.id, status: st } });
  check(`seller marks order ${st}`, r.status === 200, JSON.stringify(r.json).slice(0, 200));
}
const fin = await call("GET", `/api/orders/${bo.json?.order?.id}`, { tok: buyer2 });
check("buyer sees order delivered", JSON.stringify(fin.json).includes("DELIVERED"));
check("customer cannot cancel a delivered order", (await call("PATCH", `/api/orders/${bo.json?.order?.id}`, { tok: buyer2, body: { action: "cancel" } })).status >= 400);

// delivery application
const dv = await call("POST", "/api/delivery/application", { tok: cust, body: { vehicleType: "Bike", licenseNo: "PB65-1234", action: "submit" } });
check("delivery application", dv.status < 300, JSON.stringify(dv.json));

// ---- moderator audit and admin analytics
check("audit log", (await call("GET", "/api/moderator/audit", { tok: admin })).status === 200);
for (const p of ["insights", "trends", "segments", "anomalies", "frequently-bought-together"]) {
  const r = await call("GET", `/api/analytics/${p}${p.startsWith("freq") ? "?slug=" + prod.slug : ""}`, { tok: admin });
  check(`analytics ${p}`, r.status === 200, `${r.status} ${r.text.slice(0, 150)}`);
}
const ins = (await call("GET", "/api/analytics/insights", { tok: admin })).json;
check("insights are based on the seeded orders", JSON.stringify(ins).length > 500);
check("insights page renders", (await call("GET", "/insights")).status === 200);

// ---- recommendations, compare, misc
const rec = await call("GET", `/api/recommendations?listingId=${prod.id}`);
check("recommendations", rec.status === 200, rec.text.slice(0, 150));
const recMe = await call("GET", `/api/recommendations`, { tok: cust });
check("personal recommendations", recMe.status === 200, rec.text.slice(0, 150));
const cmp = await call("GET", `/api/compare?ids=${all50[0].id},${all50[1].id}`);
check("compare", cmp.status === 200, cmp.text.slice(0, 150));
check("entitlements", (await call("GET", "/api/entitlements", { tok: cust })).status === 200);
check("notifications", (await call("GET", "/api/notifications", { tok: cust })).status === 200);
check("messages list", (await call("GET", "/api/messages", { tok: cust })).status === 200);
const ai = await call("POST", "/api/ai/ask", { tok: cust, body: { question: "hello" } });
check("assistant is off without keys, politely", ai.status < 500, `${ai.status} ${ai.text.slice(0, 100)}`);
check("unknown page gives 404", (await call("GET", "/no-such-page")).status === 404);

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) { console.log("Failed:\n- " + failures.join("\n- ")); process.exit(1); }
