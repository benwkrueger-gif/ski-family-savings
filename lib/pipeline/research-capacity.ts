export const DEFAULT_MAX_ACTIVE_RESEARCH_JOBS = 1;
/** @deprecated Use maxActiveResearchJobs() so RESEARCH_MAX_ACTIVE is honored. */
export const MAX_ACTIVE_RESEARCH_JOBS = DEFAULT_MAX_ACTIVE_RESEARCH_JOBS;

export function maxActiveResearchJobs(): number {
  const parsed = Number.parseInt(process.env.RESEARCH_MAX_ACTIVE ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= 1) return parsed;
  return DEFAULT_MAX_ACTIVE_RESEARCH_JOBS;
}

export function canLaunchResearch(
  activeCount: number,
  maxActive = maxActiveResearchJobs(),
): boolean {
  return activeCount < maxActive;
}
