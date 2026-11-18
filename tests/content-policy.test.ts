import assert from "node:assert/strict";
import test from "node:test";
import { activeHub } from "../lib/dashboard/content-policy.ts";
import type { HubData } from "../lib/feeds/feed-types";

test("old cached content excludes retired teams without losing shared active stories", () => {
  const cached: HubData = JSON.parse(`{
    "checked": "2026-11-17T14:00:00Z",
    "stories": [
      { "id": "retired-basketball", "source": "Eurohoops", "teams": ["zalgiris"] },
      { "id": "retired-soccer", "source": "Stars and Stripes FC", "teams": ["usmnt"] },
      { "id": "shared", "source": "ESPN", "teams": ["usmnt", "loons"] },
      { "id": "active", "source": "ESPN", "teams": ["wolves"] }
    ],
    "games": [
      { "team": "zalgiris" },
      { "team": "usmnt" },
      { "team": "frost" }
    ],
    "health": [
      { "name": "Eurohoops", "teams": ["zalgiris"] },
      { "name": "Stars and Stripes FC", "teams": ["usmnt"] },
      { "name": "ESPN", "teams": ["wolves"] }
    ]
  }`);
  const original = JSON.stringify(cached);
  const filtered = activeHub(cached);

  assert.deepEqual(
    filtered.stories.map(({ id, teams }) => ({ id, teams })),
    [
      { id: "shared", teams: ["loons"] },
      { id: "active", teams: ["wolves"] },
    ],
  );
  assert.deepEqual(filtered.games.map(({ team }) => team), ["frost"]);
  assert.deepEqual(filtered.health.map(({ name }) => name), ["ESPN"]);
  assert.equal(JSON.stringify(cached), original);
});
