import type { Family } from "./schema";

function namePart(value: string | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

export function familyFileBase(family: Family): string {
  const first = namePart(family.firstName) || "Family";
  const last = namePart(family.lastName || family.familyName);
  return last ? `${first}-${last}-Family` : `${first}-Family`;
}

export function reportFileStem(family: Family, kind: "scan" | "plan"): string {
  const base = familyFileBase(family);
  return kind === "scan" ? `${base}-Savings-Scan` : `${base}-Savings-Plan`;
}
