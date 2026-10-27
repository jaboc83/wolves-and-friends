// Minnesota Twins: server-only provider config.
import type { TeamProviders } from "../team-types";

export const twinsProviders = {
  team: "twins",
  newsFeeds: [
    {
      name: "Twins Daily",
      url: "https://twinsdaily.com/rss/3-twins-daily-content.xml/",
    },
    { name: "Puckett's Pond", url: "https://puckettspond.com/feed/" },
  ],
  // Discover only social links published by the club, never search/fan channels.
  youtube: {
    name: "Minnesota Twins",
    officialSite: "https://www.mlb.com/twins",
  },
  socialTags: ["#MNTwins"],
  espnTeamId: "9",
  powerRankingSource: "cbs-mlb",
} as const satisfies TeamProviders;
