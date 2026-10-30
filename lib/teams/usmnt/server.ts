// U.S. Men's National Team: official fixtures outside ESPN's friendly feed.
import type { TeamServerHooks } from "../server-types";
import { usmntVerifiedGames } from "../../games/usmnt-schedule";

export const usmntServer: TeamServerHooks = {
  team: "usmnt",
  feedTasks: [
    {
      name: "Official U.S. Soccer schedule",
      section: "schedules",
      official: true,
      preserveLabels: true,
      run: async ({ checked }) => {
        const games = usmntVerifiedGames(checked);
        return { games, count: games.length };
      },
    },
  ],
};
