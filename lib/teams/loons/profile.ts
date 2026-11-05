// Minnesota United (Loons): client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const loonsProfile = {
  id: "loons",
  name: "Minnesota United",
  short: "Loons",
  sport: "MLS",
  color: "#51accb",
  theme: { primary: "#171b1e", accent: "#8cd2f4", soft: "#edf6fa" },
  logo: "/logos/loons.png",
  pattern: "minnesota united|mnufc",
  league: "soccer/usa.1",
  espn: "17362",
  sources: [
    ["Official MNUFC schedule", "https://www.mnufc.com/schedule/matches"],
    ["Official MNUFC", "https://www.mnufc.com/news/"],
    [
      "Yard Barker",
      "https://www.yardbarker.com/soccer/teams/minnesota_united/17423",
    ],
    [
      "Andy Greder · Pioneer Press",
      "https://www.twincities.com/author/andy-greder/",
    ],
  ],
  communities: [
    {
      name: "r/minnesotaunited",
      url: "https://www.reddit.com/r/minnesotaunited/hot/?t=week",
    },
  ],
  injuryReportUrl:
    "https://www.mlssoccer.com/league-reports/player-availability-report/",
  wikipediaPage: "Minnesota United FC",
  homeLocation: "Minnesota",
  sportKind: "soccer",
  standingsRules: {
    preseasonTableIsRegularSeason: true,
    cuts: [
      {
        after: 7,
        label: "Direct Round One places end · 8–9 enter Wild Card",
      },
      { after: 9, label: "Playoff places end" },
    ],
    qualification:
      "Top 9 per conference qualify: 1–7 enter Round One; 8–9 play the Wild Card match.",
  },
} as const satisfies TeamProfile;
