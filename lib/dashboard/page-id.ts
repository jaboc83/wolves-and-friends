import { isTeamId, type TeamId } from "../teams/teams";

export const DASHBOARD_PAGE_IDS = {
  ALL: "all",
  MARCH_MADNESS: "march-madness",
} as const;

export type DashboardPageId =
  TeamId | (typeof DASHBOARD_PAGE_IDS)[keyof typeof DASHBOARD_PAGE_IDS];

export function isDashboardPageId(value: unknown): value is DashboardPageId {
  return (
    typeof value === "string" &&
    (isTeamId(value) ||
      value === DASHBOARD_PAGE_IDS.ALL ||
      value === DASHBOARD_PAGE_IDS.MARCH_MADNESS)
  );
}
