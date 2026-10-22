// Validates cached feed shapes and restores a still-supported selected team.
import type { HubData, Story } from "../feeds/feed-types";
import { teams } from "../teams/teams";
import { browserStorage } from "../browser/storage";
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";
export function isStories(value: unknown): value is Story[] {
  return (
    Array.isArray(value) &&
    value.every(
      (story) =>
        object(story) &&
        ["id", "title", "url", "source", "date", "kind"].every(
          (key) => typeof story[key] === "string",
        ) &&
        Array.isArray(story.teams) &&
        story.teams.every((team) => typeof team === "string"),
    )
  );
}
export function isHubData(value: unknown): value is HubData {
  return (
    object(value) &&
    typeof value.checked === "string" &&
    isStories(value.stories) &&
    Array.isArray(value.games) &&
    value.games.every(
      (game) =>
        object(game) &&
        [
          "id",
          "team",
          "name",
          "date",
          "state",
          "status",
          "league",
          "venue",
          "broadcast",
          "url",
        ].every((key) => typeof game[key] === "string") &&
        Number.isFinite(Date.parse(game.date as string)) &&
        Array.isArray(game.competitors) &&
        game.competitors.every(
          (player) =>
            object(player) &&
            ["name", "score", "homeAway"].every(
              (key) => typeof player[key] === "string",
            ),
        ),
    ) &&
    Array.isArray(value.health) &&
    value.health.every(
      (health) =>
        object(health) &&
        typeof health.name === "string" &&
        typeof health.status === "string" &&
        typeof health.checked === "string" &&
        Array.isArray(health.teams) &&
        health.teams.every((team) => typeof team === "string"),
    )
  );
}
export function storedTeam(storage: Pick<Storage, "getItem"> = browserStorage) {
  let id: string | null = null;
  try {
    id = storage.getItem("wf-team");
  } catch {}
  return id &&
    (id === "all" ||
      id === "march-madness" ||
      teams.some((team) => team.id === id))
    ? id
    : "wolves";
}
