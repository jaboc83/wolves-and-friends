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
  if (active === "all") {
    const today = chicagoDay(new Date(now).toISOString());
    return stories.filter(
      (s) =>
        Number.isFinite(Date.parse(s.date)) && chicagoDay(s.date) === today,
    );
  }
  return stories.filter((s) => Date.parse(s.date) >= now - 7 * 86400000);
}
