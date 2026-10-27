// Žalgiris Kaunas: server-only feed and standings behavior.
import type { TeamServerHooks } from "../server-types";
import { parseZalgiris } from "../../feeds/zalgiris";
import {
  parseEuroLeagueStandings,
  parseLklStandings,
  parseZalgirisRoster,
} from "../../feeds/special-team-data";
import { zalgirisProviders } from "./providers";

const officialSchedule = "Official Žalgiris schedule";

export const zalgirisServer: TeamServerHooks = {
  team: "zalgiris",
  feedTasks: [
    {
      name: officialSchedule,
      section: "schedules",
      run: async ({ get, checked }) => {
        const r = await get(zalgirisProviders.urls.officialSchedule);
        const games = parseZalgiris(await r.text(), checked);
        return { games, count: games.length };
      },
    },
  ],
  fallbacks: {
    [officialSchedule]: { games: (g) => g.team === "zalgiris" },
    "Official Žalgiris news": {
      stories: (s) => s.source.startsWith("Official Žalgiris"),
    },
  },
  loadTeamInfo: async ({ info, checked, getText }) => {
    await Promise.all([
      (async () => {
        try {
          const table = parseEuroLeagueStandings(
            await getText("https://www.eurohoops.net/euroleague-standings/"),
            checked,
          );
          if (!table) throw Error("No standings table parsed");
          info.tables.push(table);
        } catch {
          info.unavailable.push("EuroLeague standings");
        }
      })(),
      (async () => {
        try {
          const table = parseLklStandings(
            await getText("https://en.lkl.lt/turnyrine-lentele"),
            checked,
          );
          if (!table) throw Error("No LKL standings table parsed");
          info.tables.push(table);
        } catch {
          info.unavailable.push("LKL standings");
        }
      })(),
      (async () => {
        try {
          info.depth = parseZalgirisRoster(
            await getText(zalgirisProviders.urls.roster),
            checked,
          );
          if (!info.depth) throw Error("No roster parsed");
        } catch {
          info.unavailable.push("roster");
        }
      })(),
    ]);
  },
};
