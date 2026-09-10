/**
 * Skier-facing mountain names for customer emails.
 * Known resorts are mapped on purpose. Unknown names are left alone.
 */
const KNOWN_MOUNTAINS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bbolton valley(?:\s+resort)?\b/i, name: "Bolton" },
  { pattern: /\bburke mountain(?:\s+resort)?\b/i, name: "Burke" },
  { pattern: /\bdartmouth skiway\b/i, name: "Dartmouth" },
  { pattern: /\bkillington(?:\s+resort)?\b/i, name: "Killington" },
  { pattern: /\bmad river glen(?:\s+cooperative)?\b/i, name: "Mad River Glen" },
  { pattern: /\bcochran'?s(?:\s+ski area)?\b/i, name: "Cochran's" },
  { pattern: /\bsugarbush(?:\s+resort)?\b/i, name: "Sugarbush" },
  { pattern: /\bstowe mountain(?:\s+resort)?\b/i, name: "Stowe" },
  { pattern: /\bjay peak(?:\s+resort)?\b/i, name: "Jay Peak" },
  { pattern: /\bsmugglers?'?\s+notch(?:\s+resort)?\b/i, name: "Smugglers' Notch" },
  { pattern: /\bmagic mountain(?:\s+resort)?\b/i, name: "Magic" },
  { pattern: /\bokemo(?:\s+mountain(?:\s+resort)?)?\b/i, name: "Okemo" },
  { pattern: /\bstratton(?:\s+mountain(?:\s+resort)?)?\b/i, name: "Stratton" },
  { pattern: /\bmount snow(?:\s+resort)?\b/i, name: "Mount Snow" },
  { pattern: /\bbromley(?:\s+mountain(?:\s+resort)?)?\b/i, name: "Bromley" },
  { pattern: /\bascending\s+okemo\b/i, name: "Okemo" },
  { pattern: /\bcannon mountain\b/i, name: "Cannon" },
  { pattern: /\bloon mountain(?:\s+resort)?\b/i, name: "Loon" },
  { pattern: /\bwaterville valley(?:\s+resort)?\b/i, name: "Waterville Valley" },
  { pattern: /\battitash(?:\s+mountain(?:\s+resort)?)?\b/i, name: "Attitash" },
  { pattern: /\bwinter park(?:\s+resort)?\b/i, name: "Winter Park" },
  { pattern: /\bsteamboat(?:\s+(?:ski\s+)?resort)?\b/i, name: "Steamboat" },
  { pattern: /\bbreckenridge(?:\s+ski resort)?\b/i, name: "Breck" },
  { pattern: /\bvail(?:\s+resort)?\b/i, name: "Vail" },
  { pattern: /\baspen(?:\s+snowmass|\s+mountain)?\b/i, name: "Aspen" },
  { pattern: /\bcopper mountain(?:\s+resort)?\b/i, name: "Copper" },
  { pattern: /\bkeystone(?:\s+resort)?\b/i, name: "Keystone" },
  { pattern: /\bbeaver creek(?:\s+resort)?\b/i, name: "Beaver Creek" },
  { pattern: /\bwhiteface(?:\s+mountain)?\b/i, name: "Whiteface" },
  { pattern: /\bgore mountain\b/i, name: "Gore" },
];

const SKIP_MOUNTAIN =
  /^(vermont|new hampshire|maine|massachusetts|new york|connecticut)$/i;

const SKIP_PHRASE =
  /few other|not yet named|not yet selected|variety|participating|online member|additional resorts|considering/i;

export function conversationalMountainName(value: string | null | undefined): string | null {
  const raw = value?.replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const primary = raw.split(",")[0]?.trim() ?? raw;
  const cleaned = primary.replace(/\s+(considering|not yet named|possibly).*$/i, "").trim();
  if (!cleaned || SKIP_MOUNTAIN.test(cleaned) || SKIP_PHRASE.test(cleaned)) return null;

  for (const known of KNOWN_MOUNTAINS) {
    if (known.pattern.test(cleaned)) return known.name;
  }
  return cleaned;
}

export function conversationalMountainList(values: string[] | undefined, limit = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const name = conversationalMountainName(value);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

export function withConversationalMountains(text: string): string {
  let next = text;
  for (const known of KNOWN_MOUNTAINS) {
    next = next.replace(known.pattern, known.name);
  }
  return next;
}
