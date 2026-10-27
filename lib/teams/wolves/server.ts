// Minnesota Timberwolves: server-only feed behavior.
import type { TeamServerHooks } from "../server-types";
import { parseNbaTeamNews } from "../../feeds/feed-parsers";
import { wolvesProviders } from "./providers";

export const wolvesServer: TeamServerHooks = {
  team: "wolves",
  feedTasks: [
    {
      name: "Official Timberwolves news",
      section: "news",
      run: async ({ get }) => {
        const stories = parseNbaTeamNews(
          await (await get(wolvesProviders.urls.officialNews)).text(),
        );
        if (!stories.length) throw new Error("No NBA team stories");
        return { stories, count: stories.length };
      },
    },
  ],
  // ESPN's default schedule omits some phases; fetch preseason through playoffs.
  extendEspnSchedule: async ({
    json,
    games,
    health,
    baseline,
    checked,
    schedule,
  }) => {
    const season =
      json && typeof json === "object" && "season" in json
        ? json.season
        : undefined;
    const responseYear =
      season && typeof season === "object" && "year" in season
        ? season.year
        : undefined;
    const year =
      ((typeof responseYear === "number" || typeof responseYear === "string") &&
        responseYear) ||
      new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0);
    const phases = await Promise.allSettled(
      [1, 2, 3].map((phase) =>
        schedule("?season=" + year + "&seasontype=" + phase),
      ),
    );
    for (const phase of phases)
      if (phase.status === "fulfilled") games.push(...phase.value);
    if (phases.some((p) => p.status === "rejected")) {
      health.push({
        name: "ESPN full-season schedule · Wolves",
        teams: ["wolves"],
        checked,
        status: "unavailable",
        count: 0,
      });
      games.push(
        ...baseline.games.filter(
          (g) =>
            g.team === "wolves" &&
            Date.parse(g.date) > Date.now() - 86400000 &&
            !games.some((p) => p.id === g.id),
        ),
      );
    }
  },
  fallbacks: {
    "Bluesky · Wolves starter pack": {
      stories: (s) => s.kind === "social" && s.teams.includes("wolves"),
    },
  },
};
