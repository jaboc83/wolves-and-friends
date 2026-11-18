// Minnesota Wild: client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const wildProfile = {
  id: "wild",
  name: "Minnesota Wild",
  short: "Wild",
  sport: "NHL",
  color: "#458665",
  theme: { primary: "#154734", accent: "#a6192e", soft: "#edf3ee" },
  logo: "/logos/wild.png",
  pattern: "minnesota wild|kaprizov",
  league: "hockey/nhl",
  espn: "min",
  sources: [
    ["NHL news", "https://www.nhl.com/news/"],
    ["Official Wild", "https://www.nhl.com/wild/"],
  ],
  communities: [
    {
      name: "r/wildhockey",
      url: "https://www.reddit.com/r/wildhockey/hot/?t=week",
    },
  ],
  injuryReportUrl: "https://www.espn.com/nhl/injuries",
  wikipediaPage: "Minnesota Wild",
  homeLocation: "Minnesota",
  sportKind: "hockey",
  divisionStandings: { group: 8, name: "Central Division" },
  standingsRules: {
    qualificationTableNameIncludes: "Conference",
    qualification:
      "NHL qualification: top 3 in each division plus 2 wild cards per conference. Division tables show automatic places; the wild-card table excludes the top 3 from each division. Positions are provisional until clinched.",
  },
} as const satisfies TeamProfile;
