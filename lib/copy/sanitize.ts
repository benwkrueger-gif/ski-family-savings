const EM_DASH = /\u2014/g;
const EN_DASH = /\u2013/g;

export function stripEmDashes(value: string): string {
  return value.replace(EM_DASH, ",").replace(EN_DASH, "-");
}

export function shortId(internalId: string): string {
  return internalId.replace(/-/g, "").slice(0, 8);
}

export function emailPrefix(email: string): string {
  const local = email.split("@")[0] ?? "customer";
  return local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "customer";
}

export function safeFolderDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
