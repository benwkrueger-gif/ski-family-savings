/**
 * Offer-mode rule lives here so it is easy to change after seeing real reports.
 *
 * PATH A (SCAN_UPSELL): conservative core savings are compelling enough to offer the $49 Plan.
 * PATH B (FULL_PLAN_FREE): they are not, so we give the full Savings Plan for free.
 *
 * Override at deploy time with COMPELLING_SAVINGS_MIN without editing this file.
 */
export const COMPELLING_SAVINGS_MIN = Number.parseInt(
  process.env.COMPELLING_SAVINGS_MIN ?? "100",
  10,
);

export const DEFAULT_SEASON = "2026/27";
export const DRIVE_SEASON_FOLDER = "2026-27";
export const DRIVE_ROOT_FOLDER_NAME = "Ski Family Savings - Customer Reports";
export const SAVINGS_PLAN_PRICE_LABEL = "$49";
