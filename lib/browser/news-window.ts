// Keeps the dashboard's "recent" story list aligned to a calendar day (all-teams page)
// or a rolling 24 hours (team pages).
import type { Story } from "../feeds/feed-types";
import type { DashboardPageId } from "../dashboard/page-id";
import { DASHBOARD_PAGE_IDS } from "../dashboard/page-id.ts";
import { dayInTimeZone } from "./local-time.ts";
const DAY_MS = 24 * 3600000;
export function recentStories(
  stories: Story[],
  active: DashboardPageId,
  {
    now = Date.now(),
    timeZone = "America/Chicago",
  }: { now?: number; timeZone?: string } = {},
) {
  if (active !== DASHBOARD_PAGE_IDS.ALL) {
    return stories.filter((s) => {
      const time = Date.parse(s.date);
      return Number.isFinite(time) && time > now - DAY_MS && time <= now;
    });
  }
  const today = dayInTimeZone(new Date(now), timeZone);
  return stories.filter(
    (s) =>
      Number.isFinite(Date.parse(s.date)) &&
      dayInTimeZone(s.date, timeZone) === today,
  );
}
