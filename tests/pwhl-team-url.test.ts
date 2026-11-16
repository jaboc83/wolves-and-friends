import assert from "node:assert/strict";
import test from "node:test";
import { pwhlTeamLocation, pwhlTeamUrl } from "../lib/teams/pwhl-team-url.ts";

test("PWHL team names link to official team pages", () => {
  const teams = [
    ["Boston Fleet", "boston-fleet", "Boston"],
    ["Detroit Clutch", "detroit-clutch", "Detroit"],
    ["Hamilton Havoc", "hamilton-havoc", "Hamilton"],
    ["Minnesota Frost", "minnesota-frost", "Minnesota"],
    ["Montréal Victoire", "montreal-victoire", "Montréal"],
    ["New York Sirens", "new-york-sirens", "New York"],
    ["Ottawa Charge", "ottawa-charge", "Ottawa"],
    ["San Jose Sea Lions", "san-jose-sea-lions", "San Jose"],
    ["Seattle Torrent", "seattle-torrent", "Seattle"],
    ["Toronto Sceptres", "toronto-sceptres", "Toronto"],
    ["Vancouver Goldeneyes", "vancouver-goldeneyes", "Vancouver"],
    ["Vegas Vanguards", "vegas-vanguards", "Las Vegas"],
  ];

  for (const [name, slug, location] of teams) {
    assert.equal(pwhlTeamUrl(name), `https://www.thepwhl.com/en/teams/${slug}`);
    assert.equal(pwhlTeamLocation(name), location);
  }
});

test("PWHL opponent locations are available for compact matchup cards", () => {
  assert.equal(pwhlTeamLocation("Vancouver Goldeneyes"), "Vancouver");
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
});

test("PWHL team URL resolver handles the Frost short name and unknown teams", () => {
  assert.equal(
    pwhlTeamUrl("Frost", true),
    "https://www.thepwhl.com/en/teams/minnesota-frost",
  );
  assert.equal(pwhlTeamUrl("unknown team"), undefined);
});
