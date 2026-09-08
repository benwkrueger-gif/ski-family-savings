export const MAX_ACTIVE_RESEARCH_JOBS = 1;

export function canLaunchResearch(
  activeCount: number,
  maxActive = MAX_ACTIVE_RESEARCH_JOBS,
): boolean {
  return activeCount < maxActive;
}
