/** Up to two capital letters from a name or email. */
export function initialsOf(name: string | null | undefined): string {
  const base = (name ?? "").split("@")[0]!.trim();
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "Y";
  const letters = parts.length === 1 ? parts[0]!.slice(0, 2) : parts[0]![0]! + parts[1]![0]!;
  return letters.toUpperCase();
}
