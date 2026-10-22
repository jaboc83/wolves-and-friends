// Applies calendar-day boundaries and lifecycle labels to calendar events.
import type { Game } from "../feeds";
import { dayInTimeZone } from "../browser/local-time";
const defaultTimeZone = "America/Chicago";
export const eventDay = (value: string | Date, timeZone = defaultTimeZone) =>
  dayInTimeZone(value, timeZone);
export function gameDay(
  game: Pick<Game, "dateOnly">,
  value: string,
  timeZone = defaultTimeZone,
) {
  return game.dateOnly ? value.slice(0, 10) : eventDay(value, timeZone);
}
export function eventIsToday(
  g: Game,
  now = new Date(),
  timeZone = defaultTimeZone,
) {
  const today = eventDay(now, timeZone);
  return (
    gameDay(g, g.date, timeZone) === today ||
    Boolean(
      g.endDate &&
      gameDay(g, g.date, timeZone) <= today &&
      gameDay(g, g.endDate, timeZone) >= today,
    )
  );
}
export function eventLifecycle(
  g: Game,
  now = new Date(),
  timeZone = defaultTimeZone,
): Game {
  if (!g.eventOnly) return g;
  const today = eventDay(now, timeZone),
    start = gameDay(g, g.date, timeZone),
    end = gameDay(g, g.endDate || g.date, timeZone);
  const state = today > end ? "post" : today >= start ? "in" : "pre";
  return {
    ...g,
    state,
    status:
      state === "post"
        ? "Completed · official results"
        : state === "in"
          ? "Tournament in progress"
          : "Scheduled",
  };
}
export function eventDateLabel(g: Game, timeZone = defaultTimeZone) {
  const fmt = (date: string) => {
    const value = g.dateOnly
      ? new Date(`${date.slice(0, 10)}T00:00:00Z`)
      : new Date(date);
    return value.toLocaleDateString("en-US", {
      timeZone: g.dateOnly ? "UTC" : timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };
  return (
    fmt(g.date) +
    (g.endDate &&
    gameDay(g, g.endDate, timeZone) !== gameDay(g, g.date, timeZone)
      ? " – " + fmt(g.endDate)
      : "")
  );
}
