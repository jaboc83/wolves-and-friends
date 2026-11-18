// Minnesota Wild: server-only provider config.
import type { TeamProviders } from "../team-types";

export const wildProviders = {
  team: "wild",
  newsFeeds: [
    { name: "Gone Puck Wild", url: "https://gonepuckwild.com/feed/" },
    {
      name: "The Athletic",
      url: "https://www.nytimes.com/athletic/rss/nhl/wild/",
    },
  ],
  youtube: { name: "Minnesota Wild", channel: "UCQRr7SxnnndFYuuRUtOIEnA" },
  socialTags: ["#MNWild"],
  espnTeamId: "30",
  powerRankingSource: "cbs-nhl",
  urls: {
    salary: "https://capwages.com/teams/minnesota_wild",
  },
} as const satisfies TeamProviders;
