import assert from "node:assert/strict";
import test from "node:test";
import { espnTeamUrl } from "../lib/teams/espn-team-url.ts";

test("ESPN team links preserve canonical name routes instead of numeric IDs", () => {
  assert.equal(
    espnTeamUrl("basketball/nba", {
      abbreviation: "POR",
      displayName: "Portland Trail Blazers",
      links: [
        { href: "https://www.espn.com/nba/team/_/id/22" },
        {
          href: "http://www.espn.com/nba/team/_/name/por/portland-trail-blazers?platform=feed",
        },
      ],
    }),
    "https://www.espn.com/nba/team/_/name/por/portland-trail-blazers",
  );
});

test("ESPN abbreviations build name routes when canonical links are absent", () => {
  for (const [league, abbreviation, displayName, path] of [
    ["basketball/nba", "MIN", "Minnesota Timberwolves", "nba/min/minnesota-timberwolves"],
    ["football/nfl", "MIN", "Minnesota Vikings", "nfl/min/minnesota-vikings"],
    ["baseball/mlb", "MIN", "Minnesota Twins", "mlb/min/minnesota-twins"],
    ["hockey/nhl", "MTL", "Montréal Canadiens", "nhl/mtl/montreal-canadiens"],
    ["basketball/wnba", "MIN", "Minnesota Lynx", "wnba/min/minnesota-lynx"],
  ]) {
    const [route, ...slug] = path.split("/");
    assert.equal(
      espnTeamUrl(league, { abbreviation, displayName }),
      `https://www.espn.com/${route}/team/_/name/${slug.join("/")}`,
    );
  }
});

test("untrusted, wrong-league, or ID-only URLs do not become team links", () => {
  for (const href of [
    "https://www.espn.com/nba/team/_/id/22",
    "https://www.espn.com/nfl/team/_/name/min/minnesota-vikings",
    "https://www.espn.com.evil.test/nba/team/_/name/por",
    "javascript:alert(1)",
  ])
    assert.equal(espnTeamUrl("basketball/nba", { links: [{ href }] }), undefined);
  assert.equal(espnTeamUrl("basketball/nba", { abbreviation: "22" }), undefined);
  assert.equal(espnTeamUrl("soccer/eng.1", { abbreviation: "CRY" }), undefined);
});
