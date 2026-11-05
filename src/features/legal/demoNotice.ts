/**
 * Single source of truth for the "demo mode" wording shown across the site
 * (About, Privacy, Terms, footer, checkout, orders, AI knowledge).
 * The wording is honest and temporary: demo today, real payments planned for the future, no date promised.
 */
export const DEMO_NOTICE = {
  /** One short sentence for banners, checkout and footer. */
  short:
    "ShopNGo is currently an academic project running in demo mode, so payments and purchases are not real right now. We plan to move to real production in future, after which real payments and purchases will be possible.",
  /** Checkout and payment notice. */
  checkout:
    "ShopNGo is currently running in demo mode, so no real money is taken when you place this order. Real payments are planned for the future.",
  /** Label on the pay button of an order. */
  payButton: "Pay now (demo payment, real payments coming later)",
  /** Terms of Service wording. */
  terms:
    "Currently, the service runs in demo mode on a temporary basis; real payments and real purchases are not processed at this time. We plan to move to production in future, and these Terms and our Privacy Policy will be updated before real payments begin.",
  /** Terms: orders section body. */
  termsOrders:
    "Currently, payments on ShopNGo run in demo mode on a temporary basis. Real payments and real purchases are not processed at this time, so please do not enter real card, bank or UPI details. Orders, prices and delivery times are for demonstration for now. We plan to move to production in future, and these Terms and our Privacy Policy will be updated before real payments begin.",
  /** Privacy Policy wording. */
  privacy:
    "Currently, ShopNGo runs in demo mode on a temporary basis, and real payments are not processed at this time, so we do not collect or store real card, UPI or bank details. We plan to move to production in future, and this Privacy Policy will be updated before real payments begin.",
  /** About page paragraph. */
  about:
    "Right now ShopNGo is an academic project running in demo mode, so payments and purchases are not live yet. We are working to move it to real production soon, and real payments and real purchases will be possible in the future.",
  /** Footer line. */
  footer: "Currently an academic project in demo mode. Real payments are planned for the future.",
  /** Legal page banner. */
  banner:
    "ShopNGo is currently an academic project running in demo mode on a temporary basis. Payments and purchases are not real at this time. We plan to move to real production in future, after which real payments and purchases will be possible. This document was written by students and has not been reviewed by a lawyer.",
  /** AI assistant knowledge. */
  ai: "Right now the site is an academic project in demo mode: payments are demo payments and purchases are not real, so no real money moves. It is planned to move to real production in future, when real payments and purchases will become possible. No date is promised.",
} as const;
