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
    {
      name: "The Athletic",
      url: "https://www.nytimes.com/athletic/rss/mlb/twins/",
    },
  ],
  // Discover only social links published by the club, never search/fan channels.
  youtube: {
    name: "Minnesota Twins",
    channel: "UCkXEh3jSl4oB1mQqjIePfTg",
  },
  socialTags: ["#MNTwins"],
  espnTeamId: "9",
  powerRankingSource: "cbs-mlb",
  urls: {
    salary: "https://www.fangraphs.com/roster-resource/payroll/twins",
  },
} as const satisfies TeamProviders;
