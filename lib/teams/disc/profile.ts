// Pro disc golf (DGPT / PDGA): client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const discProfile = {
  id: "disc",
  name: "Pro Disc Golf",
  short: "Disc golf",
  sport: "DGPT / PDGA",
  color: "#d4a84c",
  theme: { primary: "#172f45", accent: "#d4a84c", soft: "#f7f2e7" },
  logo: "/logos/disc.svg",
  pattern: "disc golf|usdgc|throw pink",
  league: "",
  espn: "",
  sources: [
    ["PDGA News", "https://www.pdga.com/news"],
    ["PDGA Live", "https://www.pdga.com/live"],
    ["Disc Golf Pro Tour", "https://www.dgpt.com/"],
    ["Ultiworld Disc Golf", "https://discgolf.ultiworld.com/"],
    ["Disc Golf Network", "https://www.discgolfnetwork.com/"],
    ["Jomez Pro", "https://www.youtube.com/@JomezPro"],
  ],
  communities: [],
  injuryReportUrl: "",
  wikipediaPage: "",
  homeLocation: "",
  sportKind: "disc",
  individual: true,
  tabLogo: "/logos/dgpt.png",
  logoAlt: "Disc Golf Pro Tour logo",
  scoreboardUrl: "https://www.pdga.com/live",
  standingsPage: "https://www.dgpt.com/full-standings/",
  rosterPage: "https://www.dgpt.com/",
  badges: [
    { pattern: "jomezpro", label: "JomezPro", tone: "jomezpro" },
    {
      pattern: "pdga major|united states disc golf championship",
      label: "PDGA Major",
      tone: "pdga-major",
    },
    { pattern: "\\bdgpt\\b", label: "DGPT", tone: "dgpt" },
  ],
  // The provider links the Powerball Cup to its overview, not its results.
  eventScoreLinks: [
    {
      pattern: "powerball-2026|/2026-powerball-cup/",
      url: "https://www.dgpt.com/event-scores/?id=96421",
    },
  ],
} as const satisfies TeamProfile;
