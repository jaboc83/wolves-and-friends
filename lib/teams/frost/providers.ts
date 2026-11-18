// Minnesota Frost (PWHL): server-only provider config.
import type { TeamProviders } from "../team-types";

export const frostProviders = {
  team: "frost",
  newsFeeds: [
    {
      name: "The Ice Garden",
      url: "https://www.theicegarden.com/rss/",
      tagByContent: true,
    },
  ],
  youtube: {
    name: "Minnesota Frost",
    page: "https://www.youtube.com/@PWHL_Minnesota",
  },
  socialTags: ["#MinnesotaFrost"],
  salarySeason: "2025-26",
  season: {
    name: "2026–27 regular season",
    start: "2026-12-05",
    end: "2027-04-18",
    source: "PWHL official announcement",
    url: "https://www.thepwhl.com/en/news/2026/october/02/pwhl-announces-2026-27-regular-season-schedule",
  },
  urls: {
    salary: "https://www.pwhlpa.com/salary-guide",
    officialNews: "https://www.thepwhl.com/en/teams/minnesota-frost/news",
    schedule:
      "https://www.thepwhl.com/en/stats/schedule/2/11/all-months/homeaway?league=1",
    scheduleFallback:
      "https://www.thepwhl.com/en/teams/minnesota-frost/schedule",
    roster: "https://www.thepwhl.com/en/stats/roster/2/10?league=1",
  },
} as const satisfies TeamProviders;
