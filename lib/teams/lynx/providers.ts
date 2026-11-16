// Minnesota Lynx: server-only provider config.
import type { TeamProviders } from "../team-types";

export const lynxProviders = {
  team: "lynx",
  youtube: {
    name: "Minnesota Lynx",
    page: "https://www.youtube.com/minnesotalynx",
  },
  socialTags: ["#MinnesotaLynx"],
  espnTeamId: "8",
  salarySeason: "2026",
  urls: {
    salary:
      "https://herhoopstats.com/salary-cap-sheet/wnba/team/2026/minnesota-lynx-11eaecc7-357c-772c-b611-2362f5011b0b/",
  },
} as const satisfies TeamProviders;
