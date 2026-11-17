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
    ["PWHL news", "https://www.thepwhl.com/en/news"],
    [
      "Official Frost news",
      "https://www.thepwhl.com/en/teams/minnesota-frost/news",
    ],
    [
      "Official Frost · Scores & news",
      "https://www.thepwhl.com/en/teams/minnesota-frost",
    ],
    [
      "The Athletic",
      "https://www.nytimes.com/athletic/womens-hockey/team/minnesota-frost/",
    ],
    ["The Ice Garden", "https://www.theicegarden.com/"],
    ["Official PWHL standings", "https://www.thepwhl.com/en/stats/standings"],
    [
      "Official Frost schedule",
      "https://www.thepwhl.com/en/stats/schedule/2/11/all-months/homeaway?league=1",
    ],
    [
      "Official Frost roster · PWHL stats",
      "https://www.thepwhl.com/en/stats/roster/2/10?league=1",
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
  rosterPage: "https://www.thepwhl.com/en/stats/roster/2/10?league=1",
  rosterNote:
    "Official PWHL preseason roster; final regular-season roster may change.",
} as const satisfies TeamProfile;
