// Minnesota Vikings: server-only provider config.
import type { TeamProviders } from "../team-types";

export const vikingsProviders = {
  team: "vikings",
  newsFeeds: [
    {
      name: "Daily Norseman",
      url: "https://www.dailynorseman.com/rss/index.xml",
    },
  ],
  authors: [
    {
      name: "Alec Lewis",
      label: "Google News index · bylines unverified",
      url: "https://www.nytimes.com/athletic/author/alec-lewis/",
      feed: "https://news.google.com/rss/search?q=%22Alec%20Lewis%22%20site%3Anytimes.com%2Fathletic%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
      titleFilters: [/vikings/i, / - The New York Times$/],
    },
    {
      name: "Will Ragatz",
      label: "Google News index · bylines unverified",
      url: "https://www.si.com/nfl/vikings/onsi/author/will-ragatz",
      feed: "https://news.google.com/rss/search?q=%22Will%20Ragatz%22%20site%3Asi.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
      titleFilters: [/vikings/i, / - Sports Illustrated$/],
    },
    {
      name: "Ben Goessling",
      label: "Google News index · bylines unverified",
      url: "https://www.startribune.com/author/ben-goessling/6134708",
      feed: "https://news.google.com/rss/search?q=%22Ben%20Goessling%22%20site%3Astartribune.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
      titleFilters: [/vikings/i, / - (?:The Minnesota )?Star Tribune$/],
    },
  ],
  youtube: { name: "Minnesota Vikings", channel: "UCpn2WAITh-6SP4PHBzj3seg" },
  socialTags: ["#Skol"],
  espnTeamId: "16",
  powerRankingSource: "cbs-nfl",
} as const satisfies TeamProviders;
