// Pro disc golf (DGPT / PDGA): server-only provider config.
import type { TeamProviders } from "../team-types";

export const discProviders = {
  team: "disc",
  newsFeeds: [
    { name: "PDGA News", url: "https://www.pdga.com/rss.xml" },
    {
      name: "Ultiworld Disc Golf",
      url: "https://discgolf.ultiworld.com/feed/",
    },
  ],
  youtube: {
    name: "Disc Golf Pro Tour",
    page: "https://www.youtube.com/@DiscGolfProTour",
  },
  socialTags: ["#DGPT", "#PDGA"],
  season: {
    name: "2026 DGPT",
    start: "2026-02-27",
    end: "2026-10-18",
    source: "DGPT official schedule",
    url: "https://www.dgpt.com/schedule/",
    note: "Tour opener through the Powerball Cup.",
  },
  urls: {
    officialSchedule: "https://www.dgpt.com/schedule/",
    // Division (mpo/fpo) is appended.
    rankings: "https://statmando.com/rankings/dgpt/",
  },
} as const satisfies TeamProviders;
