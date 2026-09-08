const MAX_REASONABLE_PAGES = 200;

export function countPdfPages(bytes: Buffer): number | null {
  if (!bytes.length) return null;
  const ascii = bytes.toString("latin1");
  const dictionaryCounts = [
    ...ascii.matchAll(/\/Type\s*\/Pages\b[^>]*\/Count\s+(\d+)/g),
    ...ascii.matchAll(/\/Count\s+(\d+)[^>]*\/Type\s*\/Pages\b/g),
  ]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value > 0 && value <= MAX_REASONABLE_PAGES);
  if (dictionaryCounts.length > 0) return Math.max(...dictionaryCounts);

  const pageObjects = ascii.match(/\/Type\s*\/Page(?!\s*s)\b/g);
  if (pageObjects?.length && pageObjects.length <= MAX_REASONABLE_PAGES) return pageObjects.length;
  return null;
}
