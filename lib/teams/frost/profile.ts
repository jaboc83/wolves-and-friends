// Minnesota Frost (PWHL): client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const frostProfile = {
  id: "frost",
  name: "Minnesota Frost",
  short: "Frost",
  sport: "PWHL",
  color: "#ae93dc",
  theme: { primary: "#4d287b", accent: "#bca1dd", soft: "#f3eff9" },
  logo: "/logos/frost.png",
  pattern: "minnesota frost",
  league: "",
  espn: "",
  sources: [
    [
      "Official Frost news",
      "https://www.thepwhl.com/en/teams/minnesota-frost/news",
    ],
    [
      "Official Frost · Scores & news",
      "https://www.thepwhl.com/en/teams/minnesota-frost",
    ],
    ["The Ice Garden", "https://www.theicegarden.com/"],
    ["Official PWHL standings", "https://www.thepwhl.com/en/stats/standings"],
    [
      "Official Frost schedule",
      "https://www.thepwhl.com/en/stats/schedule/2/11/all-months/homeaway?league=1",
    ],
    [
      "Official Frost training camp roster",
      "https://www.thepwhl.com/en/teams/minnesota-frost/news/2026/october/07/minnesota-frost-announce-2026-27-training-camp-roster",
    ],
  ],
  communities: [
    {
      name: "r/MinnesotaFrost",
      url: "https://www.reddit.com/r/MinnesotaFrost/hot/?t=week",
    },
  ],
  injuryReportUrl: "",
  wikipediaPage: "Minnesota Frost",
  homeLocation: "Minnesota",
  sportKind: "hockey",
  scoreboardUrl: "https://www.thepwhl.com/en/teams/minnesota-frost",
  standingsPage: "https://www.thepwhl.com/en/stats/standings",
  rosterPage:
    "https://www.thepwhl.com/en/teams/minnesota-frost/news/2026/october/07/minnesota-frost-announce-2026-27-training-camp-roster",
  rosterNote:
    "Preliminary names and positions from the official training-camp announcement; final roster may change.",
} as const satisfies TeamProfile;
