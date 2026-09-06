import { z } from "zod";

export const NormalizedChildSchema = z.object({
  age: z.number().nullable(),
  grade: z.string().nullable(),
});

export const FamilyProfileSchema = z.object({
  internalId: z.string(),
  tallySubmissionId: z.string(),
  firstName: z.string(),
  email: z.string(),
  homeZip: z.string().nullable(),
  adultsCount: z.number().nullable(),
  children: z.array(NormalizedChildSchema),
  skiingStyle: z.string().nullable(),
  typicalSkiDays: z.string().nullable(),
  likelyDestinations: z.array(z.string()),
  passesAndMemberships: z.array(z.string()),
  requestedSavingsCategories: z.array(z.string()),
  weekdayFlexibility: z.string().nullable(),
  affiliations: z.array(z.string()),
  expectedSpend: z.string().nullable(),
  alreadyKnownSavings: z.string().nullable(),
  additionalNotes: z.string().nullable(),
});

export type FamilyProfile = z.infer<typeof FamilyProfileSchema>;
export type NormalizedChild = z.infer<typeof NormalizedChildSchema>;

export function familySummaryLine(profile: FamilyProfile): string {
  const parts: string[] = [];
  if (profile.adultsCount != null) {
    parts.push(`${profile.adultsCount} ${profile.adultsCount === 1 ? "adult" : "adults"}`);
  }
  if (profile.children.length > 0) {
    const kids = profile.children
      .map((child) => {
        const bits = [
          child.age != null ? `${child.age}` : null,
          child.grade ? child.grade : null,
        ].filter(Boolean);
        return bits.join(" ");
      })
      .filter(Boolean)
      .join(", ");
    parts.push(kids ? `kids ${kids}` : `${profile.children.length} kids`);
  }
  if (profile.homeZip) parts.push(profile.homeZip);
  if (profile.typicalSkiDays) parts.push(profile.typicalSkiDays);
  if (profile.likelyDestinations.length > 0) {
    parts.push(profile.likelyDestinations.slice(0, 3).join(", "));
  }
  return parts.join(" · ");
}
