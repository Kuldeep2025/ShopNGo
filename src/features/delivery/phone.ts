/** Indian mobile numbers: 10 digits starting 6 to 9, with optional +91, 91 or 0 in front. */
export function normaliseIndianPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/[\s\-().]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("91") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}
