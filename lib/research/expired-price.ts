export function expiredPriceFact(
  text: string,
  now = new Date(),
): string | null {
  const match = text.match(
    /(?:valid(?:\s+only)?\s+through|purchase\s+by)\s+(September|October|November|December|January|February|March|April|May|June|July|August)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i,
  );
  if (!match) return null;
  const year = Number(match[3] ?? now.getUTCFullYear());
  const expires = new Date(`${match[1]} ${match[2]}, ${year} 23:59:59 UTC`);
  if (Number.isNaN(expires.getTime()) || now.getTime() <= expires.getTime()) return null;
  return `${match[1]} ${match[2]}, ${year}`;
}

export function acknowledgesExpiredPrice(text: string): boolean {
  return /\b(expired|past|no longer current|current .{0,30}(?:price|prices|pricing|rate|rates)|today'?s .{0,30}(?:price|prices|pricing|rate|rates)|confirm .{0,30}(?:price|prices|pricing|rate|rates)|call .{0,40}(?:price|prices|pricing|rate|rates)|not counted)\b/i.test(
    text,
  );
}
