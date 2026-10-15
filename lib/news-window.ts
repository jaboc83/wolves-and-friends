import type { Story } from "./feeds";
export const chicagoDay = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
export function recentStories(
  stories: Story[],
  active: string,
  now = Date.now(),
) {
  return stories.filter((s) =>
    active === "all"
      ? chicagoDay(s.date) === chicagoDay(new Date(now).toISOString())
      : Date.parse(s.date) >= now - 3 * 86400000,
  );
}
