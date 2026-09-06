import type { Family } from "./schema";

export function formatFamilyLine(family: Family): string {
  const parts: string[] = [];

  if (typeof family.adults === "number") {
    parts.push(`${family.adults} ${family.adults === 1 ? "adult" : "adults"}`);
  }

  if (family.children.length > 0) {
    const kids = family.children
      .map((child) => {
        const grade = child.grade ? ` (${child.grade})` : "";
        return `${child.age}${grade}`;
      })
      .join(" and ");
    parts.push(`kids ${kids}`);
  }

  if (family.homeZip) parts.push(family.homeZip);
  if (family.annualDays) parts.push(`${family.annualDays} days`);
  if (family.skiProfile) parts.push(family.skiProfile);

  return parts.join(" · ");
}

export function destinationLine(family: Family): string {
  return family.destinations.join(" · ");
}
