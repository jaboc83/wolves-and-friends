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
} as const satisfies TeamProviders;
