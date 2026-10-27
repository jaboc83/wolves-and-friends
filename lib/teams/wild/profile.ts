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
    [
      "Jess Myers · Pioneer Press",
      "https://www.twincities.com/author/jess-myers/",
    ],
    [
      "Michael Russo · The Athletic",
      "https://www.nytimes.com/athletic/author/michael-russo/",
    ],
    [
      "Joe Smith · The Athletic",
      "https://www.nytimes.com/athletic/author/joe-smith/",
    ],
    ["Official Wild", "https://www.nhl.com/wild/"],
    ["Gone Puck Wild", "https://gonepuckwild.com/"],
    ["Yard Barker", "https://www.yardbarker.com/nhl/teams/minnesota_wild/115"],
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
  standingsRules: {
    cuts: [
      {
        after: 3,
        label: "Automatic division playoff places end",
        tableNameIncludes: "Division",
      },
      {
        after: 2,
        label: "Wild-card playoff places end",
        tableNameIncludes: "Wild Card",
      },
    ],
    qualification:
      "NHL qualification: top 3 in each division plus 2 wild cards per conference. Division tables show automatic places; the wild-card table excludes the top 3 from each division. Positions are provisional until clinched.",
  },
} as const satisfies TeamProfile;
