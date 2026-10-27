// Minnesota Frost (PWHL): server-only feed and standings behavior.
import type { TeamServerHooks } from "../server-types";
import type { ProviderResponse } from "../../team-info/index";
import { parseFrostNews } from "../../feeds/club-news";
import {
  parsePwhlRoster,
  parsePwhlSchedule,
  parsePwhlStandings,
  parsePwhlTrainingCampRoster,
} from "../../feeds/special-team-data";
import { frostProviders } from "./providers";

const officialSchedule = "Official PWHL schedule · Frost";

export const frostServer: TeamServerHooks = {
  team: "frost",
  feedTasks: [
    {
      name: "Official Minnesota Frost",
      section: "news",
      run: async ({ get }) => {
        const stories = parseFrostNews(
          await (await get(frostProviders.urls.officialNews)).text(),
        );
        if (!stories.length) throw Error("No club news");
        return { stories, count: stories.length };
      },
    },
    {
      name: officialSchedule,
      section: "schedules",
      run: async ({ get, checked }) => {
        const primaryUrl = frostProviders.urls.schedule;
        let games = parsePwhlSchedule(
          await (await get(primaryUrl)).text(),
          checked,
          primaryUrl,
        );
        if (!games.length) {
          const fallbackUrl = frostProviders.urls.scheduleFallback;
          games = parsePwhlSchedule(
            await (await get(fallbackUrl)).text(),
            checked,
            fallbackUrl,
          );
        }
        if (!games.length) throw Error("No PWHL schedule events parsed");
        return { games, count: games.length };
      },
    },
  ],
  fallbacks: {
    [officialSchedule]: { games: (g) => g.team === "frost" },
  },
  loadTeamInfo: async ({ info, checked, getText, getJsonp }) => {
    await Promise.all([
      (async () => {
        try {
          const standingsPage = await getText(
            "https://www.thepwhl.com/en/stats/standings",
          );
          const appKey = standingsPage.match(
            /\bappKey\s*=\s*['\"]([^'\"]+)['\"]/i,
          )?.[1];
          if (!appKey) throw Error("PWHL stats key not found");
          const siteId =
            standingsPage.match(/\bsite_id\s*=\s*(\d+)/i)?.[1] || "0";
          const bootstrapResult = await getJsonp({
            feed: "statviewfeed",
            view: "bootstrap",
            season: "latest",
            game_id: "",
            pageName: "teams",
            key: appKey,
            client_code: "pwhl",
            site_id: siteId,
            league_id: "",
            league_code: "",
            conference: "-1",
            division: "-1",
            lang: "en",
            callback: "wolvesFriendsCallback",
          });
          const bootstrap: ProviderResponse = Array.isArray(bootstrapResult)
            ? bootstrapResult[0] || {}
            : bootstrapResult;
          const seasonId = String(bootstrap?.current_season_id || "");
          const leagueId = String(bootstrap?.current_league_id || "");
          const seasonName =
            bootstrap?.seasons?.find((season) => String(season.id) === seasonId)
              ?.name || "current season";
          if (!seasonId || !leagueId) throw Error("PWHL season unavailable");
          const standingsResult = await getJsonp({
            feed: "statviewfeed",
            view: "teams",
            groupTeamsBy: "league",
            context: "overall",
            site_id: siteId,
            season: seasonId,
            special: "false",
            key: appKey,
            client_code: "pwhl",
            league_id: leagueId,
            conference: "-1",
            division: "undefined",
            sort: "points",
            order_direction: "normal",
            lang: "en",
            callback: "wolvesFriendsCallback",
          });
          const standings = parsePwhlStandings(
            `wolvesFriendsCallback(${JSON.stringify(standingsResult)})`,
            checked,
            seasonName,
          );
          if (!standings) throw Error("No PWHL standings parsed");
          info.tables.push(standings);
        } catch {
          info.unavailable.push("standings");
        }
      })(),
      (async () => {
        try {
          info.depth = parsePwhlRoster(
            await getText(frostProviders.urls.roster),
            checked,
          );
          if (!info.depth)
            info.depth = parsePwhlTrainingCampRoster(
              await getText(frostProviders.urls.trainingCampRoster),
              checked,
            );
          if (!info.depth) throw Error("No Frost roster parsed");
        } catch {
          info.unavailable.push("roster");
        }
      })(),
    ]);
  },
};
