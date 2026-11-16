// Minnesota Frost (PWHL): server-only feed and standings behavior.
import type { TeamServerHooks } from "../server-types";
import type { ProviderResponse } from "../../team-info/index";
import { parseFrostNews } from "../../feeds/club-news";
import {
  parsePwhlRoster,
  parsePwhlSchedule,
  parsePwhlStandings,
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
    let statsContext:
      | Promise<{
          appKey: string;
          siteId: string;
          seasonId: string;
          leagueId: string;
          seasonName: string;
        }>
      | undefined;
    const getStatsContext = () => {
      if (!statsContext)
        statsContext = (async () => {
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
          return { appKey, siteId, seasonId, leagueId, seasonName };
        })();
      return statsContext;
    };

    await Promise.all([
      (async () => {
        try {
          const { appKey, siteId, seasonId, leagueId, seasonName } =
            await getStatsContext();
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
          const { appKey, siteId, seasonId, leagueId } =
            await getStatsContext();
          const roster = await getJsonp({
            feed: "statviewfeed",
            view: "roster",
            team_id: "2",
            season_id: seasonId,
            key: appKey,
            client_code: "pwhl",
            site_id: siteId,
            league_id: leagueId,
            lang: "en",
            callback: "wolvesFriendsCallback",
          });
          const depth = parsePwhlRoster(roster, checked);
          if (!depth) throw Error("No current Frost roster parsed");
          info.depth = {
            ...depth,
            salarySourceUrl: frostProviders.urls.salary,
            salarySeason: frostProviders.salarySeason,
          };
        } catch {
          info.unavailable.push("roster");
        }
      })(),
    ]);
  },
};
