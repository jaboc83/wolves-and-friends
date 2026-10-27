// Minnesota Vikings: client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const vikingsProfile = {
  id: "vikings",
  name: "Minnesota Vikings",
  short: "Vikings",
  sport: "NFL",
  color: "#986ac7",
  theme: { primary: "#4f2683", accent: "#ffc62f", soft: "#f2eef8" },
  logo: "/logos/vikings.png",
  pattern: "minnesota vikings|justin jefferson",
  league: "football/nfl",
  espn: "min",
  sources: [
    [
      "Ben Goessling · Star Tribune",
      "https://www.startribune.com/author/ben-goessling/6134708",
    ],
    [
      "Alec Lewis · The Athletic",
      "https://www.nytimes.com/athletic/author/alec-lewis/",
    ],
    [
      "Will Ragatz · Vikings On SI",
      "https://www.si.com/nfl/vikings/onsi/author/will-ragatz",
    ],
    ["Daily Norseman", "https://www.dailynorseman.com/"],
    ["Official Vikings", "https://www.vikings.com/"],
  ],
  communities: [
    {
      name: "r/minnesotavikings",
      url: "https://www.reddit.com/r/minnesotavikings/hot/?t=week",
    },
    {
      name: "r/NFCNorthMemeWar",
      url: "https://www.reddit.com/r/NFCNorthMemeWar/hot/?t=week",
    },
  ],
  injuryReportUrl: "https://www.vikings.com/team/injury-report/",
  wikipediaPage: "Minnesota Vikings",
  homeLocation: "Minnesota",
  sportKind: "football",
  standingsRules: {
    cuts: [
      { after: 4, label: "Division-winner seeds end · 5–7 are wild cards" },
      { after: 7, label: "Playoff places end" },
    ],
    qualification:
      "Conference playoff seeds: four division winners, then three wild cards. Positions are provisional until clinched.",
  },
} as const satisfies TeamProfile;
