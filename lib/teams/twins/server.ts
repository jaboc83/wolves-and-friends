// Minnesota Twins: server-only feed behavior.
import type { TeamServerHooks } from "../server-types";

export const twinsServer: TeamServerHooks = {
  team: "twins",
  espnScheduleQuery: (year) => "?season=" + year + "&seasontype=2",
  // Show next season's published schedule during the offseason.
  extendEspnSchedule: async ({ games, baseline, schedule }) => {
    const nextYear = new Date().getFullYear() + 1;
    const inNextYear = (date: string) =>
      new Date(date).getUTCFullYear() === nextYear;
    const cachedNext = () =>
      baseline.games.filter((g) => g.team === "twins" && inNextYear(g.date));
    try {
      const next = (
        await schedule("?season=" + nextYear + "&seasontype=2")
      ).filter((g) => inNextYear(g.date));
      games.push(...(next.length ? next : cachedNext()));
    } catch {
      // A not-yet-published or temporarily unavailable future feed must
      // not erase a previously verified next-season schedule.
      games.push(...cachedNext());
    }
  },
};
