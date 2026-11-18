import assert from "node:assert/strict";
import test from "node:test";
import {
  saveHiddenTeams,
  storedHiddenTeams,
  toggleHiddenTeam,
  withVisibleTeams,
} from "../lib/dashboard/hidden-teams.ts";

test("hidden teams persist in browser storage and ignore invalid ids", () => {
  const values = new Map<string, string>([
    ["wf-hidden-teams", JSON.stringify(["frost", "nope", 3, "wolves"])],
  ]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
  assert.deepEqual(storedHiddenTeams(storage), ["frost", "wolves"]);

  saveHiddenTeams(toggleHiddenTeam(["frost", "wolves"], "frost"), storage);
  assert.deepEqual(storedHiddenTeams(storage), ["wolves"]);
});

test("hidden teams fall back to none when storage is unavailable", () => {
  assert.deepEqual(
    storedHiddenTeams({
      getItem: () => {
        throw new Error("Unavailable");
      },
    }),
    [],
  );
});

test("withVisibleTeams strips hidden tags and drops stories tagged only with hidden teams", () => {
  const items = [
    { id: "a", teams: ["wolves", "frost"] },
    { id: "b", teams: ["frost"] },
    { id: "c", teams: [] as string[] },
  ];
  assert.deepEqual(withVisibleTeams(items, ["frost"]), [
    { id: "a", teams: ["wolves"] },
    { id: "c", teams: [] },
  ]);
});
