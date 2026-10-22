// Keeps the dashboard's "recent" story list aligned to the current Chicago calendar day.
import type { Story } from "../feeds/feed-types";
export const chicagoDay = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
export function recentStories(
  stories: Story[],
  _active: string,
  now = Date.now(),
) {
  const today = chicagoDay(new Date(now).toISOString());
  return stories.filter(
    (s) => Number.isFinite(Date.parse(s.date)) && chicagoDay(s.date) === today,
  );
}
