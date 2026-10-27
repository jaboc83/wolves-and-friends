import assert from "node:assert/strict";
import test from "node:test";
import { normalizeESPNInjuries } from "../lib/feeds/injuries.ts";

test("grouped injuries inherit the group's team and normalize detail fields", () => {
  assert.deepEqual(
    normalizeESPNInjuries(
      [
        {
          displayName: "Minnesota Timberwolves",
          injuries: [
            {
              athlete: { displayName: "Player One" },
              status: "Out",
              details: { detail: "Ankle" },
            },
            {
              athlete: { fullName: "Player Two" },
              type: "Questionable",
              longComment: "Illness",
            },
          ],
        },
      ],
      "Timberwolves",
    ),
    [
      {
        player: "Player One",
        status: "Out",
        detail: "Ankle",
        team: "Minnesota Timberwolves",
      },
      {
        player: "Player Two",
        status: "Questionable",
        detail: "Illness",
        team: "Minnesota Timberwolves",
      },
    ],
  );
});

test("standalone injuries use athlete team and safe defaults", () => {
  assert.deepEqual(
    normalizeESPNInjuries(
      [
        {
          athlete: { team: { name: "Opponent" } },
        },
      ],
      "Home Team",
    ),
    [
      {
        player: "Unknown player",
        status: "Unavailable",
        detail: undefined,
        team: "Opponent",
      },
    ],
  );
});
