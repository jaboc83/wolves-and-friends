// Minnesota Vikings: server-only provider config.
import type { TeamProviders } from "../team-types";

export const vikingsProviders = {
  team: "vikings",
  newsFeeds: [
    {
      name: "Daily Norseman",
      url: "https://www.dailynorseman.com/rss/index.xml",
    },
    { name: "The Viking Age", url: "https://thevikingage.com/feed/" },
    { name: "Vikings Territory", url: "https://vikingsterritory.com/feed/" },
    {
      name: "The Athletic",
      url: "https://www.nytimes.com/athletic/rss/nfl/vikings/",
    },
  ],
  youtube: { name: "Minnesota Vikings", channel: "UCpn2WAITh-6SP4PHBzj3seg" },
  socialTags: ["#Skol"],
  espnTeamId: "16",
  powerRankingSource: "cbs-nfl",
} as const satisfies TeamProviders;
