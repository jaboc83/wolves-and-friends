// Team-specific hashtags used to discover public social posts; edit them in team providers.
import type { TeamId } from "../teams/teams";
import { teamProviders } from "../teams/providers";
export const socialTags: { team: TeamId; tags: readonly string[] }[] =
  teamProviders.flatMap((p) =>
    p.socialTags?.length ? [{ team: p.team, tags: p.socialTags }] : [],
  );
