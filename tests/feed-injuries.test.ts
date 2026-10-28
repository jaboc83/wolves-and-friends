// Tests ESPN injury normalization for grouped and standalone injuries.
import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeESPNInjuries,
  normalizePremierLeagueInjuries,
  parseMLSAvailabilityReport,
} from "../lib/feeds/injuries.ts";

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

test("MLS availability report parses one club without including the next club", () => {
  assert.deepEqual(
    parseMLSAvailabilityReport(
      `<h2>Minnesota United FC</h2><ul>
        <li>• OUT: Peter Stroud (lower extremity)</li>
        <li>• QUESTIONABLE: Alec Smir (lower extremity)</li>
      </ul><h2>Sporting Kansas City</h2>
      <li>• OUT: Player Two (ankle)</li>`,
      "Minnesota United",
    ),
    [
      {
        player: "Peter Stroud",
        status: "OUT",
        detail: "lower extremity",
        team: "Minnesota United",
      },
      {
        player: "Alec Smir",
        status: "QUESTIONABLE",
        detail: "lower extremity",
        team: "Minnesota United",
      },
    ],
  );
});

test("MLS availability report accepts clubs with no listed players", () => {
  assert.deepEqual(
    parseMLSAvailabilityReport(
      "<h2>Nashville SC</h2><p>• None</p><h2>Next Club</h2>",
      "Nashville SC",
    ),
    [],
  );
});

test("MLS availability report matches ESPN short club names", () => {
  assert.deepEqual(
    parseMLSAvailabilityReport(
      "<h2>Sporting Kansas City</h2><li>• OUT: Player One (ankle)</li>",
      "Kansas City",
    ),
    [
      {
        player: "Player One",
        status: "OUT",
        detail: "ankle",
        team: "Kansas City",
      },
    ],
  );
});

test("Premier League injury playlists preserve player order and details", () => {
  assert.deepEqual(
    normalizePremierLeagueInjuries(
      {
        items: [
          { id: 11, type: "PROMO" },
          { id: 12, type: "PROMO" },
        ],
        coverItem: { id: 11, title: "Ismaila Sarr", description: "Groin" },
      },
      [{ id: 12, title: "Chadi Riad", description: "-" }],
      "Crystal Palace",
    ),
    [
      {
        player: "Ismaila Sarr",
        status: "Injured",
        detail: "Groin",
        team: "Crystal Palace",
      },
      {
        player: "Chadi Riad",
        status: "Injured",
        detail: undefined,
        team: "Crystal Palace",
      },
    ],
  );
});
