import type { Game } from "../feeds";
export const eventDay = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export function eventIsToday(g: Game, now = new Date()) {
  const today = eventDay(now);
  return (
    eventDay(g.date) === today ||
    Boolean(
      g.endDate && eventDay(g.date) <= today && eventDay(g.endDate) >= today,
    )
  );
}
export function eventLifecycle(g: Game, now = new Date()): Game {
  if (!g.eventOnly) return g;
  const today = eventDay(now),
    start = eventDay(g.date),
    end = eventDay(g.endDate || g.date);
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
export function eventDateLabel(g: Game) {
  const fmt = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  return (
    fmt(g.date) +
    (g.endDate && eventDay(g.endDate) !== eventDay(g.date)
      ? " – " + fmt(g.endDate)
      : "")
  );
}
