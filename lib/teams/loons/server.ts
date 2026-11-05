// Minnesota United (Loons): server-only feed behavior.
import type { TeamServerHooks } from "../server-types";
import type { Game } from "../../feeds/feed-types";
import {
  mergeOfficial,
  parseLoonsCalendar,
} from "../../feeds/official-schedules";
import { loonsProviders } from "./providers";

const officialCalendar = "Official MNUFC calendar";

export const loonsServer: TeamServerHooks = {
  team: "loons",
  feedTasks: [
    {
      name: officialCalendar,
      section: "schedules",
      official: true,
      run: async ({ get, checked }) => {
        const parsed = parseLoonsCalendar(
          await (
            await get(
              loonsProviders.urls.officialCalendar.replace(
                "{year}",
                String(new Date().getFullYear()),
              ),
            )
          ).text(),
          checked,
        );
        const games: Game[] = [];
        mergeOfficial(games, parsed);
        return { games, count: parsed.length };
      },
    },
  ],
  fallbacks: {
    [officialCalendar]: {
      games: (g) => g.team === "loons" && g.sourceName === officialCalendar,
    },
  },
};
