// U.S. Men's National Team: server-only provider config.
import type { TeamProviders } from "../team-types";

export const usmntProviders = {
  team: "usmnt",
  newsFeeds: [
    {
      name: "Stars and Stripes FC",
      url: "https://www.starsandstripesfc.com/rss/index.xml",
    },
  ],
  youtube: {
    name: "U.S. Soccer",
    page: "https://www.youtube.com/@ussoccer",
    pattern: /\bUSMNT\b|\bmen.?s national team|\bMNT\b/i,
  },
  socialTags: ["#USMNT"],
} as const satisfies TeamProviders;
