// Minnesota Wild: server-only provider config.
import type { TeamProviders } from "../team-types";

export const wildProviders = {
  team: "wild",
  newsFeeds: [
    {
      name: "Yard Barker · Wild",
      url: "https://www.yardbarker.com/rss/team/115",
    },
    { name: "Gone Puck Wild", url: "https://gonepuckwild.com/feed/" },
  ],
  authors: [
    {
      name: "Jess Myers",
      label: "Google News index · bylines unverified",
      url: "https://www.twincities.com/author/jess-myers/",
      feed: "https://news.google.com/rss/search?q=%22Jess%20Myers%22%20site%3Atwincities.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
      titleFilters: [/wild/i],
    },
    {
      name: "Michael Russo",
      label: "Google News index · bylines unverified",
      url: "https://www.nytimes.com/athletic/author/michael-russo/",
      feed: "https://news.google.com/rss/search?q=%22Michael+Russo%22+site%3Anytimes.com%2Fathletic%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
      titleFilters: [/wild/i],
    },
  ],
  youtube: { name: "Minnesota Wild", channel: "UCQRr7SxnnndFYuuRUtOIEnA" },
  socialTags: ["#MNWild"],
  espnTeamId: "30",
  powerRankingSource: "cbs-nhl",
} as const satisfies TeamProviders;
