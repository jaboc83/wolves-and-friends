// Keeps the dashboard's "recent" story list aligned to a calendar day.
import type { Story } from "../feeds/feed-types";
import type { DashboardPageId } from "../dashboard/page-id";
import { dayInTimeZone } from "./local-time";
export function recentStories(
  stories: Story[],
  _active: DashboardPageId,
  {
    now = Date.now(),
    timeZone = "America/Chicago",
  }: { now?: number; timeZone?: string } = {},
) {
  const today = dayInTimeZone(new Date(now), timeZone);
  return stories.filter(
    (s) =>
      Number.isFinite(Date.parse(s.date)) &&
      dayInTimeZone(s.date, timeZone) === today,
  );
}
