// Minnesota Timberwolves: client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const wolvesProfile = {
  id: "wolves",
  name: "Minnesota Timberwolves",
  short: "Wolves",
  sport: "NBA",
  color: "#79bc43",
  // Icon uniform inspiration: royal blue, green, and crisp white.
  theme: { primary: "#21468b", accent: "#009b48", soft: "#edf3fc" },
  logo: "/logos/wolves.png",
  pattern: "timberwolves|anthony edwards|lamelo ball",
  league: "basketball/nba",
  espn: "min",
  sources: [
    [
      "Bluesky · Wolves starter pack",
      "https://bsky.app/starter-pack/canishoopus.bsky.social/3lal4p6wu5o2a",
    ],
    ["Canis Hoopus", "https://www.canishoopus.com/"],
    ["Dunking with Wolves", "https://dunkingwithwolves.com/"],
    [
      "Yard Barker",
      "https://www.yardbarker.com/nba/teams/minnesota_timberwolves/83",
    ],
    ["Howls and Growls", "https://www.youtube.com/@howlsandgrowlshoops"],
    [
      "Jon Krawczynski · The Athletic",
      "https://www.nytimes.com/athletic/author/jon-krawczynski/",
    ],
    [
      "Britt Robson · MinnPost",
      "https://www.minnpost.com/author/britt-robson/",
    ],
    ["Official Timberwolves", "https://www.nba.com/timberwolves/"],
  ],
  communities: [
    {
      name: "r/timberwolves",
      url: "https://www.reddit.com/r/timberwolves/hot/?t=week",
    },
  ],
  injuryReportUrl: "https://www.espn.com/nba/injuries",
  wikipediaPage: "Minnesota Timberwolves",
  homeLocation: "Minnesota",
  sportKind: "basketball",
  standingsRules: {
    cuts: [
      { after: 6, label: "Direct playoff places end · 7–10 enter the Play-In" },
      { after: 10, label: "Play-In places end" },
    ],
    qualification:
      "Regular-season format: top 6 in each conference qualify directly; 7–10 enter the Play-In.",
  },
  competitionPanels: {
    label: "Emirates NBA Cup standings and bracket",
    sections: [
      {
        title: "Emirates NBA Cup · 2026",
        note: "Cup games are marked with an NBA Cup label throughout the schedule and calendar.",
        links: [
          [
            "Open official NBA Cup standings and knockout picture",
            "https://www.nba.com/nba-cup/2026/standings",
          ],
        ],
      },
    ],
  },
} as const satisfies TeamProfile;
