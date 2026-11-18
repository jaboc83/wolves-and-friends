// Device-only list of teams the reader hid from the team menu and All teams content.
import { browserStorage, readStored, writeStored } from "../browser/storage.ts";
import { isTeamId, type TeamId } from "../teams/teams.ts";

export const HIDDEN_TEAMS_KEY = "wf-hidden-teams";

export function storedHiddenTeams(
  storage: Pick<Storage, "getItem"> = browserStorage,
): TeamId[] {
  return readStored(HIDDEN_TEAMS_KEY, Array.isArray, [], storage).filter(
    (id): id is TeamId => typeof id === "string" && isTeamId(id),
  );
}

export function saveHiddenTeams(
  ids: readonly TeamId[],
  storage: Pick<Storage, "setItem"> = browserStorage,
) {
  writeStored(HIDDEN_TEAMS_KEY, ids, storage);
}

export function toggleHiddenTeam(
  hidden: readonly TeamId[],
  id: TeamId,
): TeamId[] {
  return hidden.includes(id)
    ? hidden.filter((item) => item !== id)
    : [...hidden, id];
}

// Removes hidden team tags and drops items whose only tagged teams are hidden. Untagged items stay.
export function withVisibleTeams<T extends { teams: string[] }>(
  items: T[],
  hidden: readonly string[],
): T[] {
  if (!hidden.length) return items;
  return items.flatMap((item) => {
    if (!item.teams.length) return [item];
    const teams = item.teams.filter((team) => !hidden.includes(team));
    return teams.length ? [{ ...item, teams }] : [];
  });
}
