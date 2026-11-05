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
    name: "Minnesota Frost / PWHL",
    officialSite: "https://www.thepwhl.com/en/teams/minnesota-frost",
    pattern: /Minnesota|\bFrost\b/i,
  },
  socialTags: ["#MinnesotaFrost"],
  season: {
    name: "2026–27 regular season",
    start: "2026-12-05",
    end: "2027-04-18",
    source: "PWHL official announcement",
    url: "https://www.thepwhl.com/en/news/2026/october/02/pwhl-announces-2026-27-regular-season-schedule",
  },
  urls: {
    officialNews: "https://www.thepwhl.com/en/teams/minnesota-frost/news",
    schedule:
      "https://www.thepwhl.com/en/stats/schedule/2/11/all-months/homeaway?league=1",
    scheduleFallback:
      "https://www.thepwhl.com/en/teams/minnesota-frost/schedule",
    roster: "https://www.thepwhl.com/en/stats/roster/2/10?league=1",
    trainingCampRoster:
      "https://www.thepwhl.com/en/teams/minnesota-frost/news/2026/october/07/minnesota-frost-announce-2026-27-training-camp-roster",
  },
} as const satisfies TeamProviders;
