// Normalizes ESPN injury reports into the shared game injury shape for one team.
import type { Game } from "./feed-types";

type ESPNInjury = {
  athlete?: {
    displayName?: string;
    fullName?: string;
    team?: { displayName?: string; name?: string };
  };
  status?: string;
  type?: string;
  details?: { detail?: string; type?: string };
  longComment?: string;
  team?: { displayName?: string; name?: string };
};

export type ESPNInjuryGroup = ESPNInjury & {
  injuries?: ESPNInjury[];
  displayName?: string;
};

export function normalizeESPNInjuries(
  groups: ESPNInjuryGroup[],
  teamName: string,
): NonNullable<Game["injuries"]> {
  return groups
    .flatMap((group) =>
      group.injuries
        ? group.injuries.map((injury) => ({
            ...injury,
            team: group.team || { displayName: group.displayName },
          }))
        : [group],
    )
    .map((item) => ({
      player:
        item.athlete?.displayName || item.athlete?.fullName || "Unknown player",
      status: item.status || item.type || "Unavailable",
      detail:
        item.details?.detail ||
        item.details?.type ||
        item.longComment ||
        undefined,
      team:
        item.team?.displayName ||
        item.team?.name ||
        item.athlete?.team?.displayName ||
        item.athlete?.team?.name ||
        teamName,
    }))
    .filter((item) => item.player);
}
