import assert from "node:assert/strict";
import test from "node:test";
import {
  pwhlTeamLocation,
  pwhlTeamShortName,
  pwhlTeamUrl,
} from "../lib/teams/pwhl-team-url.ts";

test("PWHL team names link to official team pages", () => {
  const teams = [
    ["Boston Fleet", "boston-fleet", "Boston", "Fleet"],
    ["Detroit Clutch", "detroit-clutch", "Detroit", "Clutch"],
    ["Hamilton Havoc", "hamilton-havoc", "Hamilton", "Havoc"],
    ["Minnesota Frost", "minnesota-frost", "Minnesota", "Frost"],
    ["Montréal Victoire", "montreal-victoire", "Montréal", "Victoire"],
    ["New York Sirens", "new-york-sirens", "New York", "Sirens"],
    ["Ottawa Charge", "ottawa-charge", "Ottawa", "Charge"],
    ["San Jose Sea Lions", "san-jose-sea-lions", "San Jose", "Sea Lions"],
    ["Seattle Torrent", "seattle-torrent", "Seattle", "Torrent"],
    ["Toronto Sceptres", "toronto-sceptres", "Toronto", "Sceptres"],
    ["Vancouver Goldeneyes", "vancouver-goldeneyes", "Vancouver", "Goldeneyes"],
    ["Vegas Vanguards", "vegas-vanguards", "Las Vegas", "Vanguards"],
  ];

  for (const [name, slug, location, shortName] of teams) {
    assert.equal(pwhlTeamUrl(name), `https://www.thepwhl.com/en/teams/${slug}`);
    assert.equal(pwhlTeamLocation(name), location);
    assert.equal(pwhlTeamShortName(name), shortName);
  }
});

test("PWHL opponent locations are available for compact matchup cards", () => {
  assert.equal(pwhlTeamLocation("Vancouver Goldeneyes"), "Vancouver");
  assert.equal(pwhlTeamShortName("Vancouver Goldeneyes"), "Goldeneyes");
  assert.equal(pwhlTeamLocation("Boston Fleet"), "Boston");
  assert.equal(
    pwhlTeamUrl("PWHL Detroit"),
    "https://www.thepwhl.com/en/teams/detroit-clutch",
  );
  assert.equal(
    pwhlTeamUrl("PWHL Las Vegas"),
    "https://www.thepwhl.com/en/teams/vegas-vanguards",
  );
  assert.equal(pwhlTeamLocation("unknown team"), undefined);
  assert.equal(pwhlTeamShortName("unknown team"), undefined);
});

test("PWHL team URL resolver handles the Frost short name and unknown teams", () => {
  assert.equal(
    pwhlTeamUrl("Frost", true),
    "https://www.thepwhl.com/en/teams/minnesota-frost",
  );
  assert.equal(pwhlTeamUrl("unknown team"), undefined);
});
