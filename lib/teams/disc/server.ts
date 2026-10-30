// Pro disc golf (DGPT / PDGA): server-only feed and standings behavior.
import type { TeamServerHooks } from "../server-types";
import { parseDGPT, parseDgptSchedule } from "../../feeds/dgpt";
import { discEvents } from "../../games/event-seed";
import { discProviders } from "./providers";

const scheduleForYear = (year: number) => {
  const url = new URL(discProviders.urls.officialSchedule);
  url.searchParams.set("eventCriteria", "full_schedule");
  url.searchParams.set("eventType", "all");
  url.searchParams.set("eventYear", String(year));
  return url.href;
};

export const discServer: TeamServerHooks = {
  team: "disc",
  feedTasks: [
    {
      name: "DGPT official schedule",
      section: "schedules",
      run: async ({ get }) => {
        const currentYear = new Date().getFullYear();
        const pages = await Promise.all(
          [currentYear, currentYear + 1].map(async (year) =>
            (await get(scheduleForYear(year))).text(),
          ),
        );
        const games = [
          ...new Map(
            pages
              .flatMap((html) => parseDgptSchedule(html))
              .map((game) => [game.id, game]),
          ).values(),
        ];
        if (!games.length) throw Error("No DGPT events parsed");
        return { games, count: games.length };
      },
    },
  ],
  seedGames: (cached) => [
    ...cached.filter((g) => g.team === "disc"),
    ...discEvents,
  ],
  loadTeamInfo: async ({ info, checked }) => {
    await Promise.all(
      ["MPO", "FPO"].map(async (division) => {
        try {
          const r = await fetch(
            discProviders.urls.rankings + division.toLowerCase(),
            { signal: AbortSignal.timeout(10000) },
          );
          if (!r.ok) throw Error();
          const table = parseDGPT(await r.text(), division, checked);
          if (table.rows.length !== 10) throw Error();
          info.tables.push(table);
        } catch {
          info.unavailable.push(division + " standings");
        }
      }),
    );
    info.tables.sort(
      (a, b) => Number(b.name.includes("MPO")) - Number(a.name.includes("MPO")),
    );
  },
};
