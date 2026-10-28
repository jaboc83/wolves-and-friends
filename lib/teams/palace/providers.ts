// Crystal Palace: server-only provider config.
import type { TeamProviders } from "../team-types";

export const palaceProviders = {
  team: "palace",
  youtube: { name: "Crystal Palace FC", channel: "UCWB9N0012fG6bGyj486Qxmg" },
  socialTags: ["#CPFC"],
  espnTeamId: "384",
  powerRankingSource: "opta-epl",
  extraCompetitions: {
    "soccer/uefa.europa": "UEFA Europa League",
    "soccer/uefa.europa.conf": "UEFA Conference League",
    "soccer/uefa.champions": "UEFA Champions League",
    "soccer/eng.fa": "FA Cup",
    "soccer/eng.league_cup": "Carabao Cup",
    "soccer/eng.charity": "Community Shield",
  },
  urls: {
    injuryAvailabilityReport:
      "https://api.premierleague.com/content/premierleague/playlist/en/4509826",
    palaceRadar: "https://www.palaceradar.co.uk/",
    officialSchedule: "https://www.cpfc.co.uk/matches/",
  },
} as const satisfies TeamProviders;
