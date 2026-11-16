import assert from "node:assert/strict";
import test from "node:test";
import { parsePwhlRoster } from "../lib/feeds/special-team-data.ts";

const player = (name: string, playerId: string, birthdate: string) => ({
  prop: { name: { playerLink: playerId, seoName: name } },
  row: {
    name,
    position: "F",
    player_id: playerId,
    birthdate,
  },
});

test("PWHL roster parser uses current official sections and player links", () => {
  const roster = parsePwhlRoster(
    {
      teamName: "Minnesota Frost",
      seasonName: "2026-27 Pre-Season",
      roster: [
        {
          sections: [
            {
              title: "Forwards",
              data: [player("Maddy Christian", "358", "2003-12-24")],
            },
            {
              title: "Defenders",
              data: [player("Lee Stecklein", "24", "1994-04-23")],
            },
            {
              title: "Goalies",
              data: [player("Marlène Boissonnault", "166", "1997-06-19")],
            },
            { title: "Coaches", data: [player("Coach Name", "1", "")] },
          ],
        },
      ],
    },
    "2026-11-16T18:00:00Z",
  );

  assert.equal(roster?.source, "PWHL official roster");
  assert.equal(roster?.note, "2026-27 Pre-Season · checked 2026-11-16.");
  assert.deepEqual(
    roster?.groups.map((group) => group.position),
    ["Forwards", "Defenders", "Goaltenders"],
  );
  assert.equal(roster?.groups[0].players[0].name, "Maddy Christian");
  assert.equal(roster?.groups[0].players[0].age, 22);
  assert.equal(
    roster?.groups[0].players[0].url,
    "https://www.thepwhl.com/en/stats/player/358",
  );
});

test("PWHL roster parser rejects another team and an empty roster", () => {
  assert.equal(
    parsePwhlRoster({ teamName: "Boston Fleet", roster: [] }, "2026-11-16"),
    undefined,
  );
  assert.equal(
    parsePwhlRoster({ teamName: "Minnesota Frost", roster: [] }, "2026-11-16"),
    undefined,
  );
});
