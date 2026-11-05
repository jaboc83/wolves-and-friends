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
    ["Canis Hoopus · Lynx", "https://www.canishoopus.com/minnesota-lynx"],
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
    qualification:
      "WNBA qualification: the top 8 across the entire league. This feed provides a conference table, so no conference cutoff is drawn.",
  },
} as const satisfies TeamProfile;
