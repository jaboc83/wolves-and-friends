// Crystal Palace: client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const palaceProfile = {
  id: "palace",
  name: "Crystal Palace",
  short: "Palace",
  sport: "Premier League",
  color: "#e25b70",
  theme: { primary: "#1b458f", accent: "#e32636", soft: "#edf2fa" },
  logo: "/logos/palace.png",
  pattern: "crystal palace",
  league: "soccer/eng.1",
  espn: "384",
  sources: [
    ["Official Palace schedule", "https://www.cpfc.co.uk/matches/"],
    ["Official Palace", "https://www.cpfc.co.uk/news/"],
    ["PalaceRadar", "https://www.palaceradar.co.uk/"],
    [
      "Matt Woosnam · The Athletic",
      "https://www.nytimes.com/athletic/author/matt-woosnam/",
    ],
  ],
  communities: [
    {
      name: "r/crystalpalace",
      url: "https://www.reddit.com/r/crystalpalace/hot/?t=week",
    },
  ],
  injuryReportUrl:
    "https://www.premierleague.com/en/news/4450606/latest-premier-league-player-injuries-club-by-club-news",
  wikipediaPage: "Crystal Palace F.C.",
  homeLocation: "London",
  sportKind: "soccer",
  terms: { roster: "Squad", calendar: "Fixture calendar" },
  standingsRules: {
    preseasonTableIsRegularSeason: true,
    cuts: [
      {
        after: 4,
        label:
          "Base Champions League places end · UEFA may add a performance place",
      },
      {
        after: 7,
        label:
          "European places may extend through 7th · cup winners can shift the cutoff",
      },
      { after: 17, label: "Relegation zone · places 18–20" },
    ],
    qualification:
      "The top four are the base Champions League places. UEFA performance spots and domestic cup winners can change European cutoffs; the bottom three are relegated.",
  },
  competitionPanels: {
    label: "Crystal Palace cup and European links",
    hideDuringPostseason: true,
    sections: [
      {
        title: "Europa League · 2026/27",
        note: "Follow Palace's league-phase table now and the official bracket once knockout rounds and matchups are published.",
        links: [
          [
            "Open Europa League league phase table",
            "https://www.uefa.com/uefaeuropaleague/standings/",
          ],
          [
            "Open Europa League bracket view",
            "https://www.uefa.com/uefaeuropaleague/fixtures-results/bracket/",
          ],
        ],
      },
      {
        title: "EFL Cup bracket · 2026/27",
        links: [
          [
            "Open EFL Cup bracket",
            "https://www.livesport.com/soccer/england/efl-cup/bracket/dGljLaBU/draw/",
          ],
          [
            "Official Carabao Cup site",
            "https://www.efl.com/competitions/carabao-cup/",
          ],
        ],
      },
    ],
  },
  badges: [
    {
      pattern: "uefa europa league|europa league",
      label: "Europa League",
      tone: "europa-league",
    },
    {
      pattern: "\\bfriendly\\b|\\bfriendlies\\b",
      label: "Friendly",
      tone: "friendly",
    },
    {
      pattern: "premier league|\\bEPL\\b|eng\\.1",
      label: "Premier",
      tone: "premier",
    },
  ],
} as const satisfies TeamProfile;
