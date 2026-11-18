// Minnesota Lynx: client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const lynxProfile = {
  id: "lynx",
  name: "Minnesota Lynx",
  short: "Lynx",
  sport: "WNBA",
  color: "#5d9eba",
  theme: { primary: "#0c2340", accent: "#78b9d2", soft: "#edf5f8" },
  logo: "/logos/lynx.png",
  pattern: "minnesota lynx|napheesa collier|cheryl reeve",
  league: "basketball/wnba",
  espn: "min",
  sources: [
    ["WNBA news", "https://www.wnba.com/news"],
    ["Official Lynx", "https://lynx.wnba.com/"],
  ],
  communities: [
    {
      name: "r/MinnesotaLynx",
      url: "https://www.reddit.com/r/MinnesotaLynx/hot/?t=week",
    },
  ],
  injuryReportUrl: "https://www.espn.com/wnba/injuries",
  wikipediaPage: "Minnesota Lynx",
  homeLocation: "Minnesota",
  sportKind: "basketball",
  standingsRules: {
    qualificationTableNameIncludes: "Women's National Basketball",
    qualification:
      "WNBA qualification: the top 8 across the entire league, regardless of conference. Positions are provisional until clinched.",
  },
} as const satisfies TeamProfile;
