/** Update this date whenever the Privacy Policy or Terms change. */
export const LAST_UPDATED = "6 November 2026";
export const CONTACT_EMAIL = "kuldbehera@gmail.com";
export const PROJECT_NAME = "ShopNGo";
export const SITE_URL = "https://shopngo-kuldeep.onrender.com";

/** Current calendar year, used for the copyright line. */
export function currentYear(now: Date = new Date()): number {
  return now.getFullYear();
}

export function copyrightText(now: Date = new Date()): string {
  return `© ${currentYear(now)} ${PROJECT_NAME}.`;
}
