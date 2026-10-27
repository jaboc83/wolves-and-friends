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
  standingsRules: {
    cuts: [
      { after: 3, label: "Division-winner seeds end · 4–6 are wild cards" },
      { after: 6, label: "Postseason places end" },
    ],
    qualification:
      "League playoff seeds: three division winners and three wild cards.",
  },
} as const satisfies TeamProfile;
