// U.S. Men's National Team: client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const usmntProfile = {
  id: "usmnt",
  name: "U.S. Men’s National Team",
  short: "USMNT",
  sport: "International soccer",
  color: "#748ddd",
  theme: { primary: "#142c53", accent: "#df334b", soft: "#edf1f8" },
  logo: "/logos/usmnt.svg",
  pattern: "usmnt|u.s. men|united states men",
  league: "soccer/fifa.friendly",
  espn: "660",
  sources: [
    ["U.S. Soccer · Matches", "https://www.ussoccer.com/all-matches"],
    ["Jeff Carlisle · ESPN", "https://www.espn.com/soccer/"],
    ["Stars and Stripes FC", "https://www.starsandstripesfc.com/"],
  ],
  communities: [],
  injuryReportUrl: "",
  wikipediaPage: "United States men's national soccer team",
  homeLocation: "United States",
  sportKind: "soccer",
  noStandingsNote: "Friendly matches do not have a league table.",
} as const satisfies TeamProfile;
