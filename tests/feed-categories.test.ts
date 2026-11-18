import assert from "node:assert/strict";
import test from "node:test";
import { categoryTeamIds } from "../lib/feeds/feed-categories.ts";

const map = {
  "/sports/wolves": "wolves",
  "/sports/wild": "wild",
  "/sports/vikings": "vikings",
} as const;
const block = (...domains: string[]) =>
  domains.map((d) => `<category domain="${d}">x</category>`).join("");

test("categories map to teams, ignoring unmapped and duplicate ones", () => {
  assert.deepEqual(
    categoryTeamIds(block("/sports/vikings", "/sports"), map),
    ["vikings"],
  );
  assert.deepEqual(
    categoryTeamIds(block("/sports/wolves", "/sports/wild", "/sports/wolves"), map),
    ["wolves", "wild"],
  );
  assert.deepEqual(categoryTeamIds(block("/varsity/football"), map), []);
  assert.deepEqual(
    categoryTeamIds(
      "<category><![CDATA[Sports]]></category><category><![CDATA[Timberwolves]]></category><category>Minnesota Twins</category>",
      { Timberwolves: "wolves", "Minnesota Twins": "twins" },
    ),
    ["wolves", "twins"],
  );
});
