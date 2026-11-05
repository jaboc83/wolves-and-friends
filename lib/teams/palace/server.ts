// Crystal Palace: server-only feed behavior.
import type { TeamServerHooks } from "../server-types";
import type { Game } from "../../feeds/feed-types";
import {
  mergeLiveScoreboard,
  parsePalaceRadar,
} from "../../feeds/feed-parsers";
import { mergeOfficial, parsePalace } from "../../feeds/official-schedules";
import { palaceProfile } from "./profile";
import { palaceProviders } from "./providers";

const officialSchedule = "Official Palace schedule";

export const palaceServer: TeamServerHooks = {
  team: "palace",
  feedTasks: [
    {
      name: "Palace Radar",
      section: "news",
      run: async ({ get, checked }) => {
        const stories = parsePalaceRadar(
          await (await get(palaceProviders.urls.palaceRadar)).text(),
          checked,
        );
        if (!stories.length) throw Error("No Palace Radar stories");
        return { stories, count: stories.length };
      },
    },
    ...Object.entries(palaceProviders.extraCompetitions).map(
      ([league, name]) => ({
        name: "ESPN Palace schedule · " + name,
        section: "schedules" as const,
        run: async ({ get }: { get: (url: string) => Promise<Response> }) => {
          const games: Game[] = [];
          const json = await (
            await get(
              "https://site.api.espn.com/apis/site/v2/sports/" +
                league +
                "/teams/" +
                palaceProfile.espn +
                "/schedule",
            )
          ).json();
          mergeLiveScoreboard(games, json, league);
          const count =
            json &&
            typeof json === "object" &&
            "events" in json &&
            Array.isArray(json.events)
              ? json.events.length
              : 0;
          return { games, count };
        },
      }),
    ),
    {
      name: officialSchedule,
      section: "schedules",
      official: true,
      preserveLabels: true,
      run: async ({ get, checked }) => {
        const parsed = parsePalace(
          await (await get(palaceProviders.urls.officialSchedule)).text(),
          checked,
        );
        if (!parsed.length) throw Error("No fixtures");
        const games: Game[] = [];
        mergeOfficial(games, parsed);
        return { games, count: parsed.length };
      },
    },
  ],
  fallbacks: {
    [officialSchedule]: {
      games: (g) => g.team === "palace" && g.sourceName === officialSchedule,
    },
  },
};
