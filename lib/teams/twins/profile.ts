// Minnesota Twins: client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const twinsProfile = {
  id: "twins",
  name: "Minnesota Twins",
  short: "Twins",
  sport: "MLB",
  color: "#db5962",
  theme: { primary: "#002b5c", accent: "#d31145", soft: "#eef1f6" },
  logo: "/logos/twins.png",
  pattern: "minnesota twins",
  league: "baseball/mlb",
  espn: "min",
  sources: [
    ["MLB news", "https://www.mlb.com/news"],
    [
      "Dan Hayes · The Athletic",
      "https://www.nytimes.com/athletic/author/dan-hayes/",
    ],
    ["Twin Cities Territory", "https://omny.fm/shows/twin-cities-territory"],
    ["Official Twins", "https://www.mlb.com/twins"],
    ["Twins Daily", "https://twinsdaily.com/"],
    ["Puckett's Pond", "https://puckettspond.com/"],
  ],
  communities: [
    {
      name: "r/minnesotatwins",
      url: "https://www.reddit.com/r/minnesotatwins/hot/?t=week",
    },
  ],
  injuryReportUrl: "https://www.mlb.com/twins/news/topic/twins-injury-report",
  wikipediaPage: "Minnesota Twins",
  homeLocation: "Minnesota",
  sportKind: "baseball",
  divisionStandings: { group: 7, name: "American League Central" },
  standingsRules: {
    qualificationTableNameIncludes: "American League",
    qualification:
      "MLB qualification: three division winners and three wild cards per league. Positions are provisional until clinched.",
  },
} as const satisfies TeamProfile;
